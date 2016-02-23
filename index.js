var Registry = require('npm-registry');
var request = require('request');
var tar = require('tar')
var zlib = require('zlib');
var MemoryFs = require('memory-fs');
var mfs = new MemoryFs();
var fs = require('fs');
var path = require('path');
var rreaddir = require('recursive-readdir');
var rmdir = require('rmdir');

var Extract = function (options) {

  var registryURL = options.options.registry;
  var extractPackages = function (package, version, destination) {

    var dependencies = null;

    var getPackage = function (package) {
      return new Promise(function (resolve, reject) {
        npm.packages.get(version ? package + '@' + version : package, function (err, data) {
          if (err) {
            return reject();
          }
          var version = data[0].version;
          dependencies = data[0].dependencies || {};
          var read = request(
            registryURL +
            package + '/-/' +
            package + '-' + version + '.tgz'
          );

          var unzip = zlib.createGunzip({
            path: path.resolve('temp', 'unzip', destination, package),
            strip: 0
          });
          var extract = tar.Extract({
            path: path.resolve('temp', destination, package),
            strip: 0
          });

          read.pipe(unzip);
          unzip.pipe(extract);

          extract.on('finish', function (err) {
            if (err) {
              return reject();
            }
            resolve(data);
          });
        });
      });
    };

    var writePackage = function (data) {
      return new Promise(function (resolve, reject) {
        rreaddir(path.resolve('temp', destination, package, 'package'), function (err, files) {
          if (err) {
            return reject();
          }
          Promise.all(files.map(function (file) {
            return new Promise(function (resolve, reject) {
              fs.readFile(file, 'utf-8', function (err, content) {
                if (err) {
                  reject(err);
                }
                var targetPath = file.replace(path.resolve('temp'), '').replace(/\/package\//g, '/');
                var dirPath = path.dirname(targetPath);
                dirPath.split(path.sep).reduce(function (fullPath, partPath, index) {
                  fullPath += (index === 1 ? '' : '/') + partPath;
                  if (!options.targetFs.existsSync(fullPath)) {
                    options.targetFs.mkdirSync(fullPath);
                  }
                  return fullPath;
                }, '');
                options.targetFs.writeFileSync(targetPath, content || ' ');
                resolve();
              });
            });
          }))
          .then(function () {
            resolve(data);
          })
          .catch(reject);
        });
      })
    }

    return getPackage(package)
      .then(writePackage)
      .then(function (data) {
        console.log('Done with package', package);
        return Promise.all(Object.keys(dependencies).map(function (key) {
          return extractPackages(key, dependencies[key], path.join(destination, package, 'package', 'node_modules'));
        }))
        .then(function () {
          return data;
        });
      })
  };

  var npm = new Registry(options.options);
  return extractPackages(options.package, null, options.dest)
    .catch(function (err) {
      console.log(err);
    });
}

var moduleExport = function (options) {
  return Extract(options)
    .then(function (data) {
      return new Promise(function (resolve, reject) {
        rmdir(path.resolve('temp', options.dest, options.package), function (err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      })
      .then(function () {
        return data[0];
      });
    })
    .catch(function (err) {
      console.log(err);
    })
};


module.exports = moduleExport;
