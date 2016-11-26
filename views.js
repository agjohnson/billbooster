/* Views */

var express = require('express'),
    bill_lookup = require('../us-bill-lookup/index.js');

/* Lookup table for short name to identifiers on GovTrack */
var LOOKUP_TABLE = {
    hres: 'house_resolution',
    s: 'senate_bill',
    sjres: 'senate_joint_resolution',
    hr: 'house_bill',
    hconres: 'house_concurrent_resolution',
    sconres: 'senate_concurrent_resolution',
    hjres: 'house_joint_resolution',
    sres: 'senate_resolution',
};

module.exports = function (config) {
    var config = config || {},
        router = express.Router();

    router.get('/', function (req, res) {
        res.render('home.html');
    });

    /* Bills */
    router.param('type', function (req, res, next, bill_type) {
        req.bill_type = bill_type;
        next();
    });

    router.param('number', function (req, res, next, bill_number) {
        req.bill_number = bill_number;
        next();
    });

    router.get('/bill/:type/:number', function (req, res) {
        res.render('bill.html', {
            bill_type: req.bill_type,
            bill_number: req.bill_number,
        });
    });

    return router;
}
