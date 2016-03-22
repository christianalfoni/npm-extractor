var server = require('http').createServer();
var webpack = require('webpack');
var express = require('express');
var compression = require('compression');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var extract = require('./extract');
var preLoadPackages = require('./preloadPackages');
var deliver = require('./deliver');
var status = require('./status');
var vendorsQueue = require('./vendorsQueue');

preLoadPackages([
  // Core node
  'process',

  // Webpack
  'webpack',
  'node-pre-gyp',
  'nopt',
  'rc',
  'tar-pack',

  // Loaders
  'json-loader'
]);

app.use(compression())
app.use(bodyParser.json());

app.post('/extract', extract);
app.get('/bundles/:name/*', deliver);
app.get('/status', status.get);
app.get('/queue/:id', vendorsQueue.get);

module.exports = {
  server: server,
  app: app
};
