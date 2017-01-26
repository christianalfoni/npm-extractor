var extractor = require('./extractor');
var memoryFs = require('./memoryFs');
var utils = require('./utils');
var path = require('path');
var resolveEntries = require('./resolveEntries');
var vendorsBundler = require('./vendorsBundler');
var cleaner = require('./cleaner');
var vendorsQueue = require('./vendorsQueue');
var requestQueue = require('./requestQueue');

module.exports = function (file) {
  return function (req, res) {
    var packages = req.params.packages.split('+').reduce(function (currentPackages, package) {
      var packageArray = package.split('@');

      currentPackages[packageArray[0]] = packageArray[1];

      return currentPackages;
    }, {});
    var vendorsBundleName = utils.getVendorsBundleName(packages);
    var existingQueueId = vendorsQueue.getQueueIdByVendorsBundleName(vendorsBundleName)
    if (existingQueueId) {
      requestQueue.add(existingQueueId, file, res);
      return
    }

    var queueId = vendorsQueue.add(vendorsBundleName);
    requestQueue.add(queueId, file, res);

    Promise.all(Object.keys(packages).map(function (key) {
      console.log('Extracting package ' + key);
      return extractor({
        package: key,
        targetFs: memoryFs.fs,
        version: packages[key],
        allPackages: Object.keys(packages),
        options: {
          registry: 'http://registry.npmjs.org/',
          mindelay: 5000,
          maxDelay: 10000,
          retries: 5,
          factor: 5
        },
        tempPath: path.resolve('temp'),
        memoryPath: '/queues/' + queueId + '/node_modules'
      });
    }))
    .then(resolveEntries(packages))
    .then(vendorsBundler.compile({
        queueId: queueId,
        targetFs: memoryFs.fs
    }))
    .then(cleaner({
        queueId: queueId,
        targetFs: memoryFs.fs
    }))
    .then(function (bundle) {
      requestQueue.resolve(queueId, 'manifest.json', bundle);
      requestQueue.resolve(queueId, 'dll.js', bundle);
    })
    .catch(function (err) {
      requestQueue.reject(queueId, file, err);
    });

  }

}
