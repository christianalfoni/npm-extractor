var memoryFs = require('./memoryFs');
var utils = require('./utils');
var path = require('path');
var vendorsQueue = require('./vendorsQueue');

module.exports = function (bundle) {
  var timeout = utils.isProduction() ? 1000 * 60 * 5 : 1000 * 60;
  setTimeout(function () {
    Object.keys(bundle.entries).forEach(function (entry) {
      memoryFs.fs.rmdirSync(path.join('/', 'node_modules', entry));
    });
    memoryFs.fs.rmdirSync(path.join('/', 'bundles', bundle.name));
    vendorsQueue.remove(bundle.name);
    console.log('Removed entries ' + Object.keys(bundle.entries) + ' and ' + bundle.name);
  }, timeout);

  return bundle;
};
