/*
moduleExport({
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
