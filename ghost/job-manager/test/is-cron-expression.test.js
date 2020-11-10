// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const isCronExpression = require('../lib/is-cron-expression');

describe('Is cron expression', function () {
    it('valid cron expressions', function () {
        should(isCronExpression('* * * * *')).be.true();
        should(isCronExpression('1 * * * *')).be.true();
        should(isCronExpression('* 13-23 * * *'), 'Range should be 0-23').be.true();
    });

    it('invalid cron expressions', function () {
        should(isCronExpression('123 * * * *')).not.be.true();
        should(isCronExpression('a * * * *')).not.be.true();
        should(isCronExpression('* 13-24 * * *'), 'Invalid range should be 0-23').not.be.true();
    });
});
