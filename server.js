#!/usr/bin/env node

var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('weblocalizr');

var app = require('./src/app');


var HTTP_PORT = process.env.LOCALIZR_HTTP_PORT || process.env.LOCALIZR_PORT || process.env.HTTP_PORT || process.env.PORT || 30080;
var HTTPS_PORT = process.env.LOCALIZR_HTTPS_PORT || process.env.HTTPS_PORT || 30443;


var server = http.createServer(app);
server.listen(HTTP_PORT, function() {
  console.info('WebLocalizr HTTP server listening:', HTTP_PORT);
});

var SSL_KEY_NAME = process.env.LOCALIZR_SSL_KEY_NAME || process.env.SSL_KEY_NAME || 'localhost';

try {
  var httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'cert/'+SSL_KEY_NAME+'.key')),
    cert: fs.readFileSync(path.join(__dirname, 'cert/'+SSL_KEY_NAME+'.crt')),
    passphrase: process.env.LOCALIZR_SSL_PASS || process.env.SSL_PASS || 'auYKcimO32X2U1ogvYU/bmhd3Pt403vwIGfGctDf72tdwAyXWv'
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
