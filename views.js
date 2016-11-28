/* Views */

var express = require('express');

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

    router.get('/:type/:number', function (req, res) {
        var bill_type = req.params.type,
            bill_number = req.params.number;

        res.render('bill.html', {
            bill_type: bill_type,
            bill_number: bill_number,
        });
    });

    return router;
}
