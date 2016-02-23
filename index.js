var Registry = require('npm-registry');
var request = require('request');
var targz = require('tar.gz')
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
          var read = request(
            registryURL +
            package + '/-/' +
            package + '-' + version + '.tgz'
          );
          dependencies = data[0].dependencies || {};
          resolve(read);
        });
      });
    };

    var openPackage = function (read) {
      return new Promise(function (resolve, reject) {
        var write = targz().createWriteStream(path.resolve('temp', destination, package));
        write.on('close', function (err) {
          if (err) {
            return reject();
          }
          setTimeout(function () {
          resolve();
        }, 1000)

        });
        read.pipe(write);
      });
    }

    var writePackage = function () {
      return new Promise(function (resolve, reject) {
        rreaddir(path.resolve('temp', destination, package, 'package'), function (err, files) {
          files.forEach(function (file) {
            var targetPath = file.replace(path.resolve('temp'), '').replace(/\/package\//g, '/');
            var dirPath = path.dirname(targetPath);
            dirPath.split(path.sep).reduce(function (fullPath, partPath, index) {
              fullPath += (index === 1 ? '' : '/') + partPath;
              if (!options.targetFs.existsSync(fullPath)) {
                options.targetFs.mkdirSync(fullPath);
              }
              return fullPath;
            }, '');
            options.targetFs.writeFileSync(targetPath, fs.readFileSync(file));
          });
          resolve();
        });
      });
    }

    return getPackage(package)
      .then(openPackage)
      .then(writePackage)
      .then(function () {
        console.log('Done with package', package);
        return Promise.all(Object.keys(dependencies).map(function (key) {
          return extractPackages(key, dependencies[key], path.join(destination, package, 'package', 'node_modules'));
        }));
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
    .then(function () {
      return new Promise(function (resolve, reject) {
        rmdir(path.resolve('temp', options.dest, options.package), function (err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    })
    .catch(function (err) {
      console.log(err);
    })
};

/*
module({
  package: 'react',
  targetFs: mfs,
  options: {
    registry: 'http://registry.npmjs.org/',
    mindelay: 5000,
    maxDelay: 10000,
    retries: 5,
    factor: 5
  },
  dest: 'node_modules'
})
.then(function () {
  var fullDir = ['/node_modules'];
  var logOutDir = function (dir) {
    var dirs = [];
    try {
      dirs = mfs.readdirSync(dir);
    } catch (e) {
      return;
    }
    dirs.forEach(function (subDir) {
      fullDir.push(subDir);
      logOutDir(dir + '/' + subDir);
      fullDir.pop();
    });
  }
  logOutDir('/node_modules');
})
.catch(function (err) {
  console.log(err);
})
*/
module.exports = moduleExport;
