var extract = require('./index.js');
var MemoryFileSystem = require('memory-fs');
var mfs = new MemoryFileSystem();
var path = require('path');

var readMemDir = function (fs, dir) {
    var logOutDir = function (dir) {
      var dirs = [];
      try {
        dirs = fs.readdirSync(dir);
        console.log(dir);
      } catch (e) {
        return;
      }
      dirs.forEach(function (subDir) {
        logOutDir(dir + '/' + subDir);
      });
    }
    logOutDir(dir);
  }

extract({
  package: '@cycle/dom',
  version: '9.1.0',
  targetFs: mfs,
  options: {
    registry: 'http://registry.npmjs.org/',
    mindelay: 5000,
    maxDelay: 10000,
    retries: 5,
    factor: 5
  },
  allPackages: ['@cycle/dom'],
  tempPath: path.resolve('temp'),
  memoryPath: '/node_modules'
})
.then(function (data) {
  readMemDir(mfs, path.resolve('/node_modules'));
})
.catch(function (err) {
  console.log(err);
})
