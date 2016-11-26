/* What Can I Do */

var express = require('express'),
    cookie_parser = require('cookie-parser'),
    body_parser = require('body-parser'),
    nunjucks = require('nunjucks'),
    views = require('./views'),
    api = require('./api');

function init() {
    var app = express();

    app.use(body_parser.urlencoded({ extended: true }));
    app.use(cookie_parser());

    var engine = nunjucks.configure('templates', {
        express: app,
        autoescape: true
    });

    app.use('/', views());
    app.use('/api', api());
    app.use('/static', express.static('static'));
    app.use('/static/bower', express.static('bower_components'));
    app.listen(9000);
}

init();
