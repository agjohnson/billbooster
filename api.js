/* API */

var express = require('express'),
    bill_lookup = require('../us-bill-lookup/index.js'),
    models = require('./models'),
    Promise = require('bluebird');

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

    router.get('/bill/:type/:number', function (req, res) {
        var bill_type = LOOKUP_TABLE[req.params.type],
            bill_number = req.params.number;

        models.Bill.lookup(bill_type, bill_number)
            .then(function (bill) {
                return new Promise(function (resolve, reject) {
                    if (bill.current_status == 'referred') {
                        Promise
                            .map(bill.committees, function (committee) {
                                committee = new models.Committee(committee);
                                return committee.get_members();
                            })
                            .then(function (committees) {
                                bill.committees = committees;
                                resolve(bill);
                            });
                    }
                    else {
                        resolve(bill);
                    }
                });
            })
            .then(function (bill) {
                return res.send(bill.to_api());
            })
            .catch(function (err) {
                console.log(err);
                return res.send({error: err});
            });
    });

    /* Official lookup */
    function get_official(req, res) {
        models.Official.lookup(req.params.state, req.params.district)
            .then(function (officials) {
                res.send({officials: officials.map(function (official) {
                    return official.to_api();
                })});
            })
            .catch(function (err) {
                console.log(err);
                res.send({error: err});
            });
    }
    router.get('/officials/:state', get_official);
    router.get('/officials/:state/:district', get_official);

    /* Office lookup */
    router.all('/offices/lookup', function (req, res) {
        var address = req.body.address || req.query.address;

        models.Office.offices_from_address(address)
            .then(function (offices) {
                res.send({offices: offices.map(function (office) {
                    return office.to_api();
                })});
            })
            .catch(function (err) {
                console.log(err);
                res.send({error: err});
            });
    });

    return router;
}
