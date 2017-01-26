var memoryFs = require('./memoryFs');
var mime = require('mime');
var path = require('path');
var queue = {};

module.exports = {
  add: function (id, file, res) {
    if (!queue[id]) {
      queue[id] = {'dll.js': [], 'manifest.json': [], bundle: null}
    }

    if (queue[id].bundle) {
      var content = memoryFs.fs.readFileSync(path.join('/', 'bundles', queue[id].bundle.name, file)).toString();
      var contentType = mime.lookup(file);
      var contentLength = content.length;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', contentLength);
      res.send(content);
    } else {
      queue[id][file].push(res);
    }
  },
  remove: function (id) {
    delete queue[id];
  },
  resolve: function (id, file, bundle) {
    queue[id].bundle = bundle;
    var requests = queue[id][file];
    var content = memoryFs.fs.readFileSync(path.join('/', 'bundles', bundle.name, file)).toString();
    var contentType = mime.lookup(file);
    var contentLength = content.length;

    requests.forEach(function (res) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', contentLength);
      res.send(content);
    });

    queue[id][file] = [];
  },
  reject: function (id, file, err) {
    var requests = queue[id][file];

    requests.forEach(function (res) {
      res.status(500).send({
        message: err.message
      });
    })

    queue[id][file] = [];
  }
}
