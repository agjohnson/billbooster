/* What Can I Do */

var express = require('express'),
    cookie_parser = require('cookie-parser'),
    body_parser = require('body-parser'),
    nunjucks = require('nunjucks'),
    analytics = require('universal-analytics'),
    views = require('./views'),
    api = require('./api');

function init() {
    var app = express(),
        config = {
            google_api_token: process.env.GOOGLE_API_TOKEN,
            google_analytics_id: process.env.GOOGLE_ANALYTICS_ID,
            port: process.env.HTTP_PORT || 9000,
        };

    // App extensions
    var engine = nunjucks.configure('templates', {
        express: app,
        autoescape: true
    });

    // Middleware
    app.use(body_parser.urlencoded({ extended: true }));
    app.use(cookie_parser());
    app.use('/static', express.static('static'));
    app.use(analytics.middleware(config.google_analytics_id));
    app.use(function (req, res, next) {
        var data = {
            dp: req.path,
            dt: null,
            dh: "http://billbooster.com",
            uip: req.headers['x-forwarded-for'] || req.ip,
            ua: req.headers['user-agent']
        };
        if (req.visitor) {
            req.visitor.pageview(data).send();
        }
        next();
    });
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

    // Views
    app.use('/', views());
    app.use('/api', api(config));

    app.listen(config.port);
}

init();
