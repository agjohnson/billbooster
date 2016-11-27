/* What Can I Do */

var express = require('express'),
    cookie_parser = require('cookie-parser'),
    body_parser = require('body-parser'),
    nunjucks = require('nunjucks'),
    views = require('./views'),
    api = require('./api');

function init() {
    var app = express(),
        config = {
            google_api_token: process.env.GOOGLE_API_TOKEN,
            port: process.env.HTTP_PORT || 9000,
        };

    app.use(body_parser.urlencoded({ extended: true }));
    app.use(cookie_parser());

    var engine = nunjucks.configure('templates', {
        express: app,
        autoescape: true
    });

    app.use('/', views());
    app.use('/api', api(config));
    app.use('/static', express.static('static'));
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        if (err.name == 'HttpError') {
            var status_code = err.status_code || 500;
            return res.status(status_code).json({
                'error': err.message,
                'status_code': status_code
            });
        }
        return next(err);
    });

    app.listen(config.port);
}

init();
