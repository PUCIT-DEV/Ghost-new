const queries = require('../lib/queries');

module.exports = async function memberEmailAnalyticsUpdate({memberId}) {
    await queries.aggregateMemberStats(memberId);
};