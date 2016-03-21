var server = require('./server');

console.log('Running NPM-Extractor version: ', require('./package.json').version);

server.server.on('request', server.app);
server.server.listen(process.env.NODE_ENV === 'production' ? process.env.PORT : 5000);
