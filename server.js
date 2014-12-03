#!/usr/bin/env node

var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('weblocalizr');

var app = require('./src/app');


// HTTP port configuration
var HTTP_PORT = process.env.WEBLOCALIZR_HTTP_PORT ||
                process.env.WEBLOCALIZR_PORT ||
                process.env.HTTP_PORT ||
                process.env.PORT ||
                30080;

// HTTPS port configuration
var HTTPS_PORT = process.env.WEBLOCALIZR_HTTPS_PORT ||
                 process.env.HTTPS_PORT ||
                 30443;

// SSL key base name, suffix `.key` and `.crt` will be added
var SSL_KEY_NAME = process.env.WEBLOCALIZR_SSL_KEY_NAME ||
                   process.env.SSL_KEY_NAME ||
                   'localhost';


var server = http.createServer(app);
server.listen(HTTP_PORT, function() {
  console.info('WebLocalizr HTTP server listening:', HTTP_PORT);
});


try {
  var httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'cert/'+SSL_KEY_NAME+'.key')),
    cert: fs.readFileSync(path.join(__dirname, 'cert/'+SSL_KEY_NAME+'.crt')),
    passphrase: process.env.WEBLOCALIZR_SSL_PASS || process.env.SSL_PASS || 'auYKcimO32X2U1ogvYU/bmhd3Pt403vwIGfGctDf72tdwAyXWv'
  };

  var httpsServer = https.createServer(httpsOptions, app);
  httpsServer.listen(HTTPS_PORT, function() {
    console.info('WebLocalizr HTTPS server listening:', HTTPS_PORT);
  });
} catch(err) {
  console.error('WebLocalizr HTTPS server error:', err);
}


exports.server = server;
exports.httpsServer = httpsServer;
