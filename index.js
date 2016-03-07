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
var semver = require('semver');

var createAbsolutePath = function (absolute, relative) {
  var absolutePath = path.join(absolute, path.resolve(relative).replace(path.resolve(), ''));
  return absolutePath;
}

var Extract = function (options) {

  var registryURL = options.options.registry;
  var extractPackages = function (package, version, destination) {

    var getPackage = function (package) {
      return new Promise(function (resolve, reject) {
        npm.packages.get(package, function (err, data) {
          if (err) {
            return reject();
          }

          version = semver.maxSatisfying(Object.keys(data[0].versions), version);
          var dependencies = data[0].dependencies || {};
          var read = request(
            registryURL +
            package + '/-/' +
            package + '-' + version + '.tgz'
          );

          var unzip = zlib.createGunzip({
            path: createAbsolutePath(path.resolve(options.tempPath, 'unzip'), path.resolve(destination, package)),
            strip: 0
          });
          var extract = tar.Extract({
            path: createAbsolutePath(options.tempPath, path.resolve(destination, package)),
            strip: 0
          });

          read.pipe(unzip);
          unzip.pipe(extract);

          extract.on('finish', function (err) {
            if (err) {
              return reject();
            }
            resolve({
              data: data,
              dependencies: dependencies
            });
          });
        });
      });
    };

    var writePackage = function (result) {
      return new Promise(function (resolve, reject) {
        rreaddir(createAbsolutePath(options.tempPath, path.resolve(destination, package)), function (err, files) {
          if (err) {
            return reject();
          }
          Promise.all(files.map(function (file) {
            return new Promise(function (resolve, reject) {
              fs.readFile(file, 'utf-8', function (err, content) {
                if (err) {
                  reject(err);
                }
                var targetPath = file.replace(options.tempPath, '').replace(/\/package\//g, '/');
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
            resolve(result);
          })
          .catch(reject);
        });
      })
    }

    return getPackage(package)
      .then(writePackage)
      .then(function (result) {
        var dependencies = result.dependencies;
        options.allPackages.forEach(function (package) {
          if (dependencies[package]) {
            delete dependencies[package];
          }
        });
        return Promise.all(Object.keys(dependencies).map(function (key) {
          return extractPackages(key, dependencies[key], path.join(destination, package, 'package', 'node_modules'));
        }))
        .then(function () {
          return result.data;
        });
      })
  };

  var npm = new Registry(options.options);
  return extractPackages(options.package, options.version, options.memoryPath)
    .catch(function (err) {
      console.log(err, err.stack);
    });
}

var moduleExport = function (options) {
  return Extract(options)
    .then(function (data) {
      return new Promise(function (resolve, reject) {
        rmdir(createAbsolutePath(options.tempPath, path.resolve(options.memoryPath, options.package)), function (err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      })
      .then(function () {
        var version = semver.maxSatisfying(Object.keys(data[0].versions), options.version);
        return {
          name: data[0].name,
          version: version,
          main: data[0].versions[version].main,
          browser: data[0].versions[version].browser
        };
      });
    })
    .catch(function (err) {
      console.log(err, err.stack);
    })
};


module.exports = moduleExport;
