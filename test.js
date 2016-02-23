var extract = require('./index.js');
var MemoryFileSystem = require('memory-fs');
var mfs = new MemoryFileSystem();

extract({
  package: 'react',
  version: '0.14.7',
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
.then(function (data) {
  console.log(data);
})
.catch(function (err) {
  console.log(err);
})
