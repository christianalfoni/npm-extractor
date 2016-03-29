var hash = require('string-hash');
var path = require('path');

module.exports = {
  isProduction: function () {
    return process.env.NODE_ENV === 'production';
  },
  findEntryPoints: function (fs, entryKey, queuePath, baseEntry, otherEntries) {
    var basePath = path.dirname(baseEntry.substr(2));
    var otherPaths = otherEntries.map(function (entry) {
      return path.join(basePath, entry);
    }).filter(function (entryPath) {
      return fs.statSync(entryPath).isDirectory();
    });
    return [basePath].concat(otherPaths).reduce(function (allFiles, entryPath) {
      return allFiles.concat(fs.readdirSync(path.join(queuePath, entryPath)).filter(function (file) {
        return (path.extname(file) === '.js' || path.extname(file) === '.css') && file !== path.basename(baseEntry);
      }).map(function (file) {
        return path.join(entryPath.substr(14), file);
      }));
    }, []);
  },
  getVendorsBundleName: function (packages) {
    if (!packages || Object.keys(packages).length === 0) {
      return null;
    }
    var packagesList = Object.keys(packages).map(function (key) {
      return key + ':' + packages[key];
    }).sort(function (a, b) {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    return String(hash(JSON.stringify(packagesList)));
  },
  logError: function (err) {
    console.log(err.message);
    console.log(err.stack);
  }
};
