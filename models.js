/* Models */

var http = require('https'),
    url = require('url'),
    request = require('request'),
    Promise = require('bluebird'),
    HttpError = require('./exceptions').HttpError;

var STATUS_NEW = 'new',
    STATUS_COMMITTEE = 'committee',
    STATUS_HOUSE = 'house',
    STATUS_SENATE = 'senate',
    STATUS_PRESIDENT = 'president',
    STATUS_FAILED = 'failed',
    STATUS_PASSED = 'passed';

var STATUS = {
    prov_kill_veto: STATUS_HOUSE, // TODO originating chamber
    fail_second_senate: STATUS_FAILED,
    passed_bill: STATUS_PRESIDENT,
    // passed_constamend: STATUS_,  TODO goes to states
    pass_back_senate: STATUS_HOUSE,
    vetoed_override_fail_second_house: STATUS_FAILED,  // TODO correct?
    fail_originating_house: STATUS_FAILED,
    fail_second_house: STATUS_FAILED,
    override_pass_over_house: STATUS_SENATE,
    override_pass_over_senate: STATUS_HOUSE,
    pass_back_house: STATUS_HOUSE,
    // prov_kill_cloturefailed: STATUS_,  TODO can be retried
    enacted_veto_override: STATUS_PASSED,
    passed_concurrentres: STATUS_PASSED,
    // prov_kill_suspensionfailed: STATUS_,  TODO can be retried
    passed_simpleres: STATUS_PASSED,
    vetoed_pocket: STATUS_FAILED,  // TODO back for veto override?
    vetoed_override_fail_originating_house: STATUS_FAILED,
    conference_passed_senate: STATUS_PASSED,
    fail_originating_senate: STATUS_FAILED,
    pass_over_senate: STATUS_HOUSE,
    // prov_kill_pingpongfail: STATUS_,  TODO can be retried
    enacted_signed: STATUS_PASSED,
    pass_over_house: STATUS_SENATE,
    conference_passed_house: STATUS_SENATE,
    reported: STATUS_HOUSE,
    vetoed_override_fail_second_senate: STATUS_FAILED,
    vetoed_override_fail_originating_senate: STATUS_FAILED,
    enacted_tendayrule: STATUS_PASSED,
    introduced: STATUS_NEW,
    enacted_unknown: STATUS_PASSED,
    referred: STATUS_COMMITTEE
}

/* Bill - from GovTrack */
function Bill(data) {
    //this.data = data;
    this.number = data.number;
    this.display_number = data.display_number;
    this.status = data.current_status;
    this.status_desc = data.current_status_description;
    this.title = data.title_without_number;
    // TODO replace with common Person model, consuming role + person
    this.sponsor = {
        id: data.sponsor.id,
        name: data.sponsor.name,
        urls: {
            govtrack: data.sponsor.link
        }
    }
    this.cosponsors = data.cosponsors.map(function (cosponsor) {
        return {
            id: cosponsor.id,
            name: cosponsor.name,
            urls: {
                govtrack: cosponsor.link
            }
        };
    });
    this.committees = data.committees.map(function (committee) {
        return {
            id: committee.id,
            name: committee.name,
            urls: {
                website: committee.url
            }
        };
    });
    this.where = STATUS[data.current_status];
    this.urls = {
        govtrack: data.link
    };
}

Bill.lookup = function(bill_type, bill_number) {
    return new Promise(function (resolve, reject) {
        var req = request({
            uri: 'https://www.govtrack.us/api/v2/bill',
            qs: {
                bill_type: bill_type,
                number: bill_number,
                congress: 114
            },
            json: true
        }, function (error, res, body) {
            if (error) {
                return reject(error);
            }
            else if (body.objects && body.objects.length) {
                // TODO multiple here?
                return resolve(body.objects[0]);
            }
            else {
                return reject(new HttpError('No bills found', 404));
            }
        });
    }).then(function (bill) {
        return new Promise(function (resolve, reject) {
            var req = request({
                uri: 'https://www.govtrack.us/api/v2/bill/' + bill.id,
                json: true
            }, function (error, res, body) {
                if (error) {
                    return reject(error);
                }
                resolve(new Bill(body));
            });
        });
    });
}

/* Committee - from GovTrack */
function Committee(data) {
    //this.data = data;
    this.id = data.id;
    this.name = data.name;
    this.urls = {
        website: data.url
    };
    this.members = [];
}

Committee.prototype.get_members = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        var req = request({
            uri: 'https://www.govtrack.us/api/v2/committee_member',
            qs: {
                committee: self.id
            },
            json: true
        }, function (error, res, body) {
            if (error) {
                return reject(error);
            }
            self.members = body.objects.map(function (member) {
                return member.person.id;
            });
            resolve(self);
        });
    });
}

/* Office - from Google Civic Data API */
function Office(data) {
    // Get state and district from divisionId
    var parts = data.divisionId.split('/').reduce(function (result, item) {
        var subparts = item.split(':');
        result[subparts[0]] = subparts[1];
        return result
    }, {});

    this.country = parts.country;
    this.state = parts.state;
    this.district = parts.cd;
}

Office.prototype.get_representative = function () {
    return new Promise(function (resolve, reject) {
        var name_parts = self.data.name.split(' '),
            last_name = name_parts.pop();
        return new Promise(function (resolve, reject) {
            var req = request({
                uri: 'https://www.govtrack.us/api/v2/person',
                qs: {q: last_name, limit: 1},
                json: true,
            }, function (error, res, body) {
                if (error) {
                    return reject(error);
                }
                // TODO we're only search on last name here, this is bad.
                official.id = body.objects[0].id;
                official.name = body.objects[0].name;
                resolve(official);
            });
        });
    });
};

Office.offices_from_address = function (address, config) {
    return new Promise(function (resolve, reject) {
        var req = request({
            uri: 'https://www.googleapis.com/civicinfo/v2/representatives',
            qs: {
                address: address,
                levels: 'country',
                roles: [
                    'legislatorLowerBody',
                    'legislatorUpperBody'
                ],
                key: config.google_api_token
            },
            json: true
        }, function (error, res, body) {
            if (error) {
                return reject(error);
            }
            resolve(body);
        });
    }).then(function (result) {
        return result.offices.map(function (office, office_n) {
            office.officials = office.officialIndices.map(function (official_n) {
                return result.officials[official_n];
            });
            return office;
        })
        .filter(function (office, office_n) {
            return (
                office.roles.indexOf('legislatorLowerBody') >= 0 ||
                office.roles.indexOf('legislatorUpperBody') >= 0
            )
        })
        .map(function (office) {
            return new Office(office);
        });
    });
};


/* Official - from GovTrack API */
function Official(data) {
    // TODO make this centralized and include more info
    this.id = data.person.id;
    this.name = data.person.name
    this.role_type = data.role_type;
    this.urls = {
        govtrack: data.person.link
    };
    this.phone = data.phone;
}

Official.lookup = function(state, district) {
    var params = {
        current: true,
        state: state,
        role_type: 'senator',
    };
    if (district) {
        params['role_type'] = 'representative';
        params['district'] = district;
    }

    return new Promise(function (resolve, reject) {
        var req = request({
            uri: 'https://www.govtrack.us/api/v2/role',
            qs: params,
            json: true
        }, function (error, res, body) {
            if (error) {
                return reject(error);
            }
            resolve(body.objects.map(function (role) {
                return new Official(role);
            }));
        });
    });
}

module.exports = {
    Bill: Bill,
    Committee: Committee,
    Office: Office,
    Official: Official,
}
