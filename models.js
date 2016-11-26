/* Models */

var http = require('https'),
    url = require('url'),
    request = require('request'),
    Promise = require('bluebird');

var KEY = 'AIzaSyAnkrWjYAdItTqYo9Ux19pZU1Z3CHA1x_A';

/* Bill - from GovTrack */
function Bill(data) {
    this.data = data;
    this.current_status = data.current_status;
    this.committees = data.committees;
}

Bill.prototype.to_api = function () {
    var data = this.data;
    data.committees = this.committees.map(function (committee) {
        return committee.to_api();
    });
    data.sponsor = this.data.sponsor.id;
    delete data.sponsor_role;
    data.cosponsors = this.data.cosponsors.map(function (cosponsor) {
        return cosponsor.id;
    });
    return data;
};

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
                return reject(new Error('No bills found'));
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
    this.data = data;
    this.id = data.id;
    this.member = [];
}

Committee.prototype.to_api = function () {
    var data = this.data;
    data.members = this.members;
    return data;
};

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
    this.data = data;

    // Get state and district from divisionId
    var parts = this.data.divisionId.split('/').reduce(function (result, item) {
        var subparts = item.split(':');
        result[subparts[0]] = subparts[1];
        return result
    }, {});

    this.country = parts.country;
    this.state = parts.state;
    this.district = parts.cd;
}

Office.prototype.to_api = function () {
    return {
        country: this.country,
        state: this.state,
        district: this.district,
        name: this.data.name,
        officials: this.data.officials,
    };
};

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

Office.offices_from_address = function (address) {
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
                key: KEY
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
    this.data = data;
}

Official.prototype.to_api = function () {
    return this.data;
};

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
