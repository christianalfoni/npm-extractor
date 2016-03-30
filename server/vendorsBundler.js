var webpack = require('webpack');
var utils = require('./utils.js');
var memoryFs = require('./memoryFs');
var path = require('path');
var utils = require('./utils');
var vendorEntries = require('./vendorEntries');

module.exports = {
  compile: function (queueId) {
    return function (bundle) {
      console.log('Bundling ', bundle.entries);
      return new Promise(function (resolve, reject) {

        var vendors = Object.keys(bundle.entries).reduce(function (vendors, entryKey) {
          return vendors.concat(entryKey).concat(
            bundle.entries[entryKey].isBrowserEntry ?
              []
            :
              utils.findEntryPoints(
                memoryFs.fs,
                entryKey,
                path.join('/', 'queues', queueId),
                bundle.entries[entryKey].path,
                vendorEntries[entryKey] || []
              )
          );
        }, []);

        var vendorsCompiler = webpack({
          context: '/',
          entry: {
            vendors: vendors
          },
          output: {
            path: path.join('/', 'bundles', bundle.name),
            filename: 'bundle.js',
            library: 'webpackbin_vendors'
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
             name: 'webpackbin_vendors',
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
        });
        vendorsCompiler.outputFileSystem = memoryFs.fs;
        vendorsCompiler.inputFileSystem = memoryFs.fs;
        vendorsCompiler.resolvers.normal.fileSystem = memoryFs.fs;
        vendorsCompiler.resolvers.context.fileSystem = memoryFs.fs;
        vendorsCompiler.run(function (err) {
          if (err) {
            return reject(err);
          }

          // Rewrite the paths
          var manifestJson = JSON.parse(memoryFs.fs.readFileSync(path.join('/', 'bundles', bundle.name, 'manifest.json')).toString());
          memoryFs.fs.writeFileSync(path.join('/', 'bundles', bundle.name, 'manifest.json'), JSON.stringify(
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
