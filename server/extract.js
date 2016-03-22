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

  if (vendorsQueue.has(vendorsBundleName)) {
    return res.send({
      name: vendorsBundleName,
      inProgress: true
    });
  }
  vendorsQueue.add(vendorsBundleName);

  return Promise.all(Object.keys(packages).map(function (key) {
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
      memoryPath: '/node_modules'
    });
  }))
  .then(resolveEntries(packages))
  .then(vendorsBundler.compile)
  .then(cleaner)
  .then(function (bundle) {
    res.send({
      name: bundle.name,
      entries: bundle.entries,
      packages: bundle.packages,
      manifest: memoryFs.fs.readFileSync(path.join('/', 'bundles', bundle.name, 'manifest.json')).toString()
    });
  })
  .catch(function (err) {
    console.log(err, err.stack);
    res.status(500).send({
      message: err.message
    });
  });

}
