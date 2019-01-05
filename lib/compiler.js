var loaderUtils = require('loader-utils');
var globalizeCompiler = require('globalize-config-compiler');
var exec = require('./exec');
var path = require('path');

module.exports = function(source, map, meta) {
    var callback = this.async();
    this.cacheable && this.cacheable();
    var query = loaderUtils.getOptions(this) || {};
    var locale = query.locale;
    var sync = query.sync || false;
    var resourcePath = this.resourcePath;

    var config = exec(this, source, resourcePath);

    config.availableLocales = [locale];

    if (config.messages) {
        this.addDependency(path.resolve(this.context, config.messages.replace('[locale]', locale)));
    }

    var template;

    if (sync) {
        template = function(params) {
            var deps = 'var Globalize = ' + params.dependencies.map(function(dependency) {
                return 'require("globalize/dist/' + dependency + '")';
            }).join(';\n');
            return [
                'module.exports = function(callback) {',
                deps,
                '',
                params.code,
                '',
                '    callback(new Globalize("' + locale + '"));',
                '}'
            ].join('\n');
        };
    } else {
        template = function(params) {
            var deps = '[' + params.dependencies.map(function(dependency) {
                return '"globalize/dist/' + dependency + '"';
            }).join(', ') + ']';
            // using `define` instead of `require` here somehow reasons webpack into tracking dependency
            // between locale chunks and globalize-runtime chunk properly (as it should be)
            // and allows to properly extract and include locale assets during server-side rendering
            return [
                'module.exports = function(callback) {',
                '    define(' + deps + ', function(Globalize) {',
                '',
                params.code,
                '',
                '        callback(new Globalize("' + locale + '"));',
                '    })',
                '}'
            ].join('\n');
        };
    }

    try {
        compiled = globalizeCompiler(config, {
            context: this.context,
            compilerOptions: {
                template: template
            },
            dependentFile: this.addDependency
        });
    } catch(err) {
        callback(err);
        return;
    }

    callback(null, compiled[locale]);
}
