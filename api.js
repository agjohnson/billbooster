/* API */

var express = require('express'),
    cache = require('express-cache-headers'),
    Promise = require('bluebird'),
    models = require('./models'),
    HttpError = require('./exceptions').HttpError;

/* Lookup table for short name to identifiers on GovTrack */
var LOOKUP_TABLE = {
    hr: 'house_bill',
    s: 'senate_bill',
    hres: 'house_resolution',
    sres: 'senate_resolution',
    hjres: 'house_joint_resolution',
    sjres: 'senate_joint_resolution',
    hconres: 'house_concurrent_resolution',
    sconres: 'senate_concurrent_resolution',
};

module.exports = function (config) {
    var config = config || {},
        router = express.Router();

    router.use(cache(60*60*24*7));

    router.get('/bill/:type/:number', function (req, res, next) {
        var bill_type = LOOKUP_TABLE[req.params.type],
            bill_number = req.params.number;

        models.Bill.lookup(bill_type, bill_number)
            .then(function (bill) {
                return new Promise(function (resolve, reject) {
                    if (bill.where == 'committee') {
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
                return res.send(bill);
            })
            .catch(function (err) {
                return next(new HttpError('Bill not found', 404));
            });
    });

    /* Official lookup */
    function get_official(req, res, next) {
        models.Official.lookup(req.params.state, req.params.district)
            .then(function (officials) {
                res.send({officials: officials.map(function (official) {
                    return official;
                })});
            })
            .catch(function (err) {
                return next(new HttpError('Officials not found', 404));
            });
    }
    router.get('/officials/:state', get_official);
    router.get('/officials/:state/:district', get_official);

    /* Office lookup */
    router.all('/offices/lookup', cache({nocache: true}), function (req, res, next) {
        var address = req.body.address || req.query.address;

        models.Office.offices_from_address(address, config)
            .then(function (offices) {
                var body = {
                    offices: offices.map(function (office) {
                        return office;
                    })
                };
                res.cookie('offices', body);
                res.send(body);
            })
            .catch(function (err) {
                console.error(err);
                return next(new HttpError('Office lookup failed', 400));
            });
    });

    return router;
}
