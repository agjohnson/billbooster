/* Bill front end */

var ko = require('knockout'),
    $ = require('jquery'),
    Promise = require('bluebird'),
    cookie = require('js-cookie');

function HomeView() {
    var self = this;

    self.lookup_error = ko.observable(false);
    self.lookup = function (form) {
        var bill = form.bill.value;
        self.lookup_error(false);

        // REGEX TIME
        var bill_re = /^\s*(h[\.\s]?r|s|h[\.\s]?res|s[\.\s]?res|h[\.\s]?j[\.\s]?res|s[\.\s]?j[\.\s]?res|h[\.\s]?con[\.\s]?res|s[\.\s]?con[\.\s]?res)[\.]?\s*(\d+)\s*$/;
        var found = bill_re.exec(bill);
        if (!found) {
            return self.lookup_error(true);
        }
        else {
            var bill_type = found[1],
                bill_number = found[2];

            bill_type = bill_type.replace(/[\.\s]/g, '');
            window.location = '/' + bill_type + '/' + bill_number;
        }
    };
}

HomeView.init = function () {
    var view = new HomeView();
    $(document).ready(function () {
        ko.applyBindings(view);
    });
    return view;
};

function BillView(bill_type, bill_number) {
    var self = this;

    self.bill_type = bill_type;
    self.bill_number = bill_number;
    self.bill = ko.observable({});

    /* Mirrored properties */
    var properties = [
        'status',
        'status_desc',
        'number',
        'display_number',
        'title',
        'where',
        'committees',
        'sponsor',
        'cosponsors',
    ];
    for (var prop_n in properties) {
        var property = properties[prop_n];
        self[property] = ko.observable();
    }

    var reset_mirrored_keys = ko.computed(function () {
        var bill = self.bill(),
            keys = Object.keys(bill);
        for (key in keys) {
            if (self.hasOwnProperty(keys[key])) {
                self[keys[key]](bill[keys[key]]);
            }
        }
    });

    /* Non-bill observables */
    self.offices = ko.observableArray();
    self.officials = ko.observableArray();

    /* Util methods */
    self.is_valid = ko.computed(function () {
        return self.bill().hasOwnProperty('number');
    });
    self.is_sponsor = function (official) {
        return self.sponsor().id == official.id;
    };
    self.is_cosponsor = function (official) {
        return self.cosponsors().filter(function (cosponsor) {
            return cosponsor.id == official.id;
        }).length > 0;
    };
    self.has_committees = function () {
        return (
            self.where() == 'committee' &&
            self.committees().length > 0
        );
    };
    self.needs_officials = ko.computed(function () {
        return (
            self.is_valid() &&
            self.officials().length == 0
        );
    });
    self.is_action_share = ko.computed(function () {
        return (
            self.is_valid() &&
            self.officials().length > 0 &&
            self.actions().keys().length == 0
        );
    });

    /* Other properties */
    self.page_link = ko.computed(function () {
        return '/' + bill_type + '/' + bill_number;
    });

    /* Actions */
    self.get_officials = ko.computed(function () {
        var offices = self.offices(),
            all_officials = [];
        Promise.map(offices, function (office) {
            var url = '/api/officials/' + office.state;
            if (office.district) {
                url += '/' + office.district;
            }
            return $.get(url)
                .then(function (result) {
                    officials = result.officials;
                    for (var official_n in officials) {
                        all_officials.push(officials[official_n]);
                    }
                });
        }).then(function () {
            self.officials(all_officials);
        });
    });
    self.get_offices = function (form) {
        $.post('/api/offices/lookup', {address: form.address.value})
            .then(function (offices) {
                self.offices(offices.offices);
            });
    };
    self.actions = ko.computed(function () {
        var officials = self.officials(),
            committees = self.committees(),
            where = self.where(),
            actions = new Actions();

        officials
            .map(function (official) {
                var reason = null;
                if (self.is_sponsor(official)) {
                    actions.add_action('sponsor', official);
                }
                else if (self.is_cosponsor(official)) {
                    actions.add_action('cosponsor', official);
                }
                else if (where == 'committee') {
                    for (var committee_n in committees) {
                        var committee = committees[committee_n];
                        for (var member_n in committee.members) {
                            if (committee.members[member_n] == official.id) {
                                actions.add_action('committee', official, {
                                    committee: committee
                                });
                            }
                        }
                    }
                }
                else if (where == 'house') {
                    actions.add_action('house', official);
                }
                else if (where == 'senate' && official.role_type == 'senator') {
                    actions.add_action('senate', official);
                }
            });

        return actions;
    });
}

BillView.prototype.get_offices_from_cookie = function () {
    var offices = cookie.get('offices');
    if (offices && offices.substr(0, 2) == 'j:') {
        offices = JSON.parse(offices.slice(2));
        this.offices(offices.offices);
    }
};

BillView.prototype.get_bill = function () {
    var self = this;
    $.get('/api/bill/' + self.bill_type + '/' + self.bill_number)
        .then(function (bill) {
            self.bill(bill);
            self.get_offices_from_cookie();
        });
};

BillView.init = function (bill_type, bill_number) {
    var view = new BillView(bill_type, bill_number);
    view.get_bill();

    $(document).ready(function () {
        ko.applyBindings(view);
    });

    return view;
};

function Actions() {
    this.reasons = {};
}

Actions.prototype.add_action = function (reason, official, options) {
    var reasons = this.reasons[reason] || [];
    reasons.push({official: official, options: options});
    this.reasons[reason] = reasons;
};

Actions.prototype.keys = function () {
    return Object.keys(this.reasons);
};

module.exports = {
    BillView: BillView,
    HomeView: HomeView
}
