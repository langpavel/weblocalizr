
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var express = require('express');
var router = express.Router();


var L10N_DIR = process.env.L10N_DIR || '.';


router.get('/lang/:lang/*', function(req, res) {
  var lang = req.params.lang;
  var module = req.params[0];

  var moduleFile = path.join(L10N_DIR, lang, module+'.json');

  fs.readFile(moduleFile, 'utf-8', function(err, result) {
    res.type('application/json');
    if (err) {
      res.status(404);
      res.end(JSON.stringify(err, null, 2));
    }
    res.end(result);
  });
});


router.post('/lang/:lang/*', function(req, res) {
  var lang = req.params.lang;
  var module = req.params[0];

  var moduleFile = path.join(L10N_DIR, lang, module+'.json');
  var moduleDir = path.join(moduleFile, '..');

  res.type('application/json');

  var sendError = function(err) {
    console.error('Sending error', err);
    res.status(500);
    res.end(JSON.stringify(err, null, 2));
  };

  var writeFileContentAndSend = function(data) {
    json = JSON.stringify(data, null, '\t');
    fs.writeFile(moduleFile, json, 'utf-8', function(err) {
      if (err) {
        sendError(err);
      } else {
        res.end(json);
      }
    });
  }

  console.log("Saving into " + moduleFile + ":", req.body);

  fs.readFile(moduleFile, 'utf-8', function(err, result) {
    if (err) {
      if (err.code = "ENOENT") {
        res.status(201);
        return mkdirp(moduleDir, function (err) {
          if (err)
            return sendError(err);
          return writeFileContentAndSend(req.body);
        });
      } else {
        return sendError(err);
      }
    }
    try {
      var translations = JSON.parse(result);
    } catch(err) {
      console.error('Invalid JSON: ' + result)
      return sendError(err);
    }

    Object.keys(req.body).forEach(function(key) {
      translations[key] = req.body[key];
    });

    return writeFileContentAndSend(translations);
  });
});


module.exports = router;
