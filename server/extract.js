var extractor = require('./extractor');
var memoryFs = require('./memoryFs');
var utils = require('./utils');
var path = require('path');
var resolveEntries = require('./resolveEntries');
var vendorsBundler = require('./vendorsBundler');
var cleaner = require('./cleaner');
var vendorsQueue = require('./vendorsQueue');

module.exports = function (req, res) {
  var packages = req.body.packages;
  var vendorsBundleName = utils.getVendorsBundleName(packages);

  var existingQueueId = vendorsQueue.getQueueIdByVendorsBundleName(vendorsBundleName)
  if (existingQueueId) {
    return res.send({
      id: existingQueueId,
      name: vendorsBundleName,
      inProgress: true
    });
  }

  var queueId = vendorsQueue.add(vendorsBundleName);
  res.send({
    id: queueId,
    name: vendorsBundleName
  });

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
    vendorsQueue.update(queueId, {
      name: bundle.name,
      entries: bundle.entries,
      packages: bundle.packages,
      manifest: memoryFs.fs.readFileSync(path.join('/', 'bundles', bundle.name, 'manifest.json')).toString(),
      isDone: true
    });
  })
  .catch(function (err) {
    console.log(err, err.stack);
    res.status(500).send({
      message: err.message
    });
  });

}
