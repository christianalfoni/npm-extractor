var memoryFs = require('./memoryFs');
var mime = require('mime');
var path = require('path');
var queue = {};

module.exports = {
  add: function (id, file, res) {
    if (!queue[id]) {
      queue[id] = {'dll.js': [], 'manifest.json': []}
    }
    queue[id][file].push(res);
  },
  resolve: function (id, file, bundle) {
    var requests = queue[id][file];
    delete queue[id][file];
    var content = memoryFs.fs.readFileSync(path.join('/', 'bundles', bundle.name, file)).toString();
    var contentType = mime.lookup(file);
    var contentLength = content.length;

    requests.forEach(function (res) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', contentLength);
      res.send(content);
    });
  },
  reject: function (id, file, err) {
    var requests = queue[id][file];
    delete queue[id][file];

    requests.forEach(function (res) {
      res.status(500).send({
        message: err.message
      });
    })
  }
}
