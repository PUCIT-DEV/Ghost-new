const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyISODate} = matchers;

let agent;

describe('Stats API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    it('Can fetch member count history', async function () {
        await agent
            .get(`/stats/member-count`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
