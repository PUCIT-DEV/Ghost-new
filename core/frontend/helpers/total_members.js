// # Total Members Helper
// Usage: `{{total_members}}`

const {SafeString} = require('../services/handlebars');
const {memberCountRounding, getMemberStats} = require('../meta/member-count');

module.exports = async function total_members () { //eslint-disable-line
    let memberStats = await getMemberStats();
    const {total} = memberStats;
    return new SafeString(total > 0 ? memberCountRounding(total).toLowerCase() : 0);
};

module.exports.async = true;
