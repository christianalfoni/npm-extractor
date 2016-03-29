var memoryFs = require('./memoryFs');
var utils = require('./utils');
var path = require('path');
var vendorsQueue = require('./vendorsQueue');

module.exports = function (queueId) {
  return function (bundle) {
    var timeout = utils.isProduction() ? 1000 * 60 * 5 : 1000 * 10;
    setTimeout(function () {
      Object.keys(bundle.entries).forEach(function (entry) {
        memoryFs.fs.rmdirSync(path.join('/', 'queues', queueId, 'node_modules', entry));
      });
      memoryFs.fs.rmdirSync(path.join('/', 'bundles', bundle.name));
      memoryFs.fs.rmdirSync(path.join('/', 'queues', queueId, 'node_modules'));
      memoryFs.fs.rmdirSync(path.join('/', 'queues', queueId));
      vendorsQueue.remove(bundle.name);
      console.log('Removed entries ' + Object.keys(bundle.entries) + ' and ' + bundle.name);
    }, timeout);

    return bundle;
  }
};
