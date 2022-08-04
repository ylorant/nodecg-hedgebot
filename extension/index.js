'use strict';
const HedgebotExtension = require('./hedgebot');

module.exports = function (nodecg) {
    let extension = new HedgebotExtension();
    extension.init(nodecg);
};
