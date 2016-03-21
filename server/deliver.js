var memoryFs = require('./memoryFs');
var path = require('path');
var mime = require('mime');

module.exports = function (req, res) {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Expires', '-1');
  res.setHeader('Pragma', 'no-cache');
  var fileName = path.basename(req.url);
  if (!memoryFs.fs.existsSync(req.url)) {
    return res.sendStatus(404);
  }
  var content = memoryFs.fs.readFileSync(req.url);
  res.setHeader("Content-Type", mime.lookup(fileName));
  res.setHeader("Content-Length", content.length);
  res.send(content);
  return;
};
