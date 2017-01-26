var webpack = require('webpack');
var path = require('path');
var utils = require('./utils');
var vendorEntries = require('./vendorEntries');
var merge = require('webpack-merge');

module.exports = {
  compile: function (options) {

    options = options || {};
    var queueId = options.queueId;

    return function (bundle) {
      console.log('Bundling ', bundle.entries);
      return new Promise(function (resolve, reject) {

        var vendors = Object.keys(bundle.entries).reduce(function (vendors, entryKey) {
          return vendors.concat(entryKey).concat(
            bundle.entries[entryKey].isBrowserEntry ?
              []
            :
              utils.findEntryPoints(
                options.targetFs,
                entryKey,
                path.join('/', 'queues', queueId),
                bundle.entries[entryKey].path,
                vendorEntries[entryKey] || []
              )
          );
        }, []);

        var defaultWebpackConfig = {
          context: '/',
          entry: {
            vendors: vendors
          },
          output: {
            path: path.join('/', 'bundles', bundle.name),
            filename: 'dll.js',
            library: bundle.name + '_bundle'
          },
          resolveLoader: {
            root: path.resolve('node_modules')
          },
          resolve: {
            root: path.join('/', 'queues', queueId, 'node_modules')
          },
          plugins: [
            new webpack.DefinePlugin({
              'process.env': {
                'NODE_ENV': JSON.stringify('production'),
              }
            }),
            new webpack.DllPlugin({
             path: path.join('/', 'bundles', bundle.name, 'manifest.json'),
             name: 'webpack_vendors',
             context: '/'
           }),
           new webpack.optimize.UglifyJsPlugin({minimize: true, mangle: false})
         ],
         module: {
           loaders: [{
             test: /\.json$/,
             loader: 'json'
           }]
         }
        };

        var webpackConfig = merge.smart(
            options.webpack || {},
            defaultWebpackConfig
        );

        var vendorsCompiler = webpack(webpackConfig);
        vendorsCompiler.outputFileSystem = options.targetFs;
        vendorsCompiler.inputFileSystem = options.targetFs;
        vendorsCompiler.resolvers.normal.fileSystem = options.targetFs;
        vendorsCompiler.resolvers.context.fileSystem = options.targetFs;
        vendorsCompiler.run(function (err) {
          if (err) {
            return reject(err);
          }

          // Rewrite the paths
          var manifestJson = JSON.parse(options.targetFs.readFileSync(path.join('/', 'bundles', bundle.name, 'manifest.json')).toString());
          options.targetFs.writeFileSync(path.join('/', 'bundles', bundle.name, 'manifest.json'), JSON.stringify(
            Object.assign(manifestJson, {
              content: Object.keys(manifestJson.content).reduce(function (newContent, key) {
                newContent[key.replace('/queues/' + queueId, '')] = manifestJson.content[key];
                return newContent;
              }, {})
            })
          ));
          resolve(bundle);
        });
      })
      .catch(utils.logError);
    }
  }
};
