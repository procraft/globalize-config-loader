var loaderUtils = require('loader-utils');
var exec = require('./exec');

module.exports = function(source, map, meta) {
    var callback = this.async();
    this.cacheable && this.cacheable();
    var query = loaderUtils.getOptions(this) || {};
    var sync = query.sync || false;
    var locale = query.locale || null;
    var resourcePath = this.resourcePath;

    var config = exec(this, source, resourcePath);

    var remainingRequest = loaderUtils.getRemainingRequest(this);

    var options = [];
    config.availableLocales.forEach(function(submodule) {
        if (locale === null || locale === submodule) {
            options.push({
                submodule: submodule,
                loader: loaderUtils.stringifyRequest(this,
                    '!!' + require.resolve('./compiler')
                    + '?sync=' + (sync ? 'true' : 'false')
                    + '&locale=' + submodule
                    + '!' + remainingRequest
                )
            });
        }
    });

    var result = [
        'module.exports = function(locale, cb) {',
        '    switch (locale) {',
        options.map(function(value) {
            return [
                '        case ' + JSON.stringify(value.submodule) + ':',
                sync
              ? '            cb(require(' + value.loader + '));'
              : '            require.ensure([], function(require) { cb(require(' + value.loader + ')); }, "locale-' +
                             value.submodule + '");',
                '            break;'
            ].join('\n');
        }).join('\n'),
        '        default:',
        '            throw new Error("Cannot find module " + locale + ".");',
        '    }',
        '}'
    ];

    callback(null, result.join('\n'));
}
