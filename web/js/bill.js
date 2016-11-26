/* Bill front end */

var ko = require('knockout'),
    $ = require('jquery'),
    Promise = require('bluebird');

function BillView() {
    var self = this;

    self.bill = ko.observable({});
    self.is_valid = ko.computed(function () {
        return self.bill().hasOwnProperty('number');
    });

    /* Util properties */
    self.title = ko.computed(function () {
        var noun = self.bill().noun || 'bill';
        noun = (noun.charAt(0).toUpperCase()) + noun.slice(1);
        return noun + " " + self.bill().display_number;
    });
    self.status = ko.computed(function () {
        return self.bill().current_status;
    });
    self.status_desc = ko.computed(function () {
        return self.bill().current_status_description;
    });

    /* Actions */
    self.where = ko.computed(function () {
        var status = self.status();
        if (status == 'referred') {
            return 'committee';
        }
    });

    /* Actions */
    self.offices = ko.observableArray();
    self.officials = ko.observableArray();
    self.get_offices = function (form) {
        var all_officials = [];
        $.post('/api/offices/lookup', {address: form.address.value})
            .then(function (offices) {
                return Promise.map(offices.offices, function (office) {
                    var url = '/api/officials/' + office.state;
                    if (office.district) {
                        url += '/' + office.district;
                    }
                    return $.get(url)
                        .then(function (officials) {
                            officials = officials.officials;
                            for (official_n in officials) {
                                all_officials.push(officials[official_n]);
                            }
                        });
                }).then(function () {
                    self.officials(all_officials);
                });
            });
    };
    self.actions = ko.computed(function () {
        var officials = self.officials(),
            committees = self.bill().committees,
            where = self.where(),
            actions = [];

        for (official_n in officials) {
            var official = officials[official_n];
            if (where == 'committee') {
                for (committee_n in committees) {
                    var committee = committees[committee_n];
                    for (member_n in committee.members) {
                        if (committee.members[member_n] == official.person.id) {
                            actions.push(official.person.name + " is a member of " + committee.name);
                        }
                    }
                }
            }
        }

        return actions;
    });
}

BillView.init = function (bill_type, bill_number) {
    var view = new BillView();
    $.get('/api/bill/' + bill_type + '/' + bill_number)
        .then(function (bill) {
            view.bill(bill);
        });

    $(document).ready(function () {
        ko.applyBindings(view);
    });

    return view;
};

module.exports.BillView = BillView;
