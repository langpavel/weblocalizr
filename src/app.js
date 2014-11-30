var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressMarkdown = require('express-markdown');
var cors = require('cors');

var routes = require('./routes/index');
var language = require('./routes/language');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var PUBLIC_PATH = path.join(__dirname, '../public');
var DOC_PATH = path.join(__dirname, '../doc');

// uncomment after placing your favicon in /public
app.use(favicon(PUBLIC_PATH + '/favicon.ico'));
app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(PUBLIC_PATH));

app.use(expressMarkdown({
  directory: DOC_PATH,
  view: 'markdown',
  variable: 'content'
}));
app.use(express.static(PUBLIC_PATH));

app.use('/', routes);
app.use('/api', language);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
