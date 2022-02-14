const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyDate, anyString, anyArray} = matchers;

const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const Papa = require('papaparse');

let agent;

describe('Members API', function () {
    let request;
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleProducts');
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse', async function () {
        await agent
            .get('/members/')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(8).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse with filter', async function () {
        await agent
            .get('/members/?filter=label:label-1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse with search', async function () {
        await agent
            .get('/members/?search=member1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can filter by paid status', async function () {
        await agent
            .get('/members/?filter=status:paid')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(5).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read and include email_recipients', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/?include=email_recipients`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch member counts stats', async function () {
        await agent
            .get(`/members/stats/count/`)
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can add', async function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com',
            note: 'test note',
            subscribed: false,
            labels: ['test-label']
        };

        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(422);
    });

    it('Can add complimentary subscription', async function () {
        const stripeService = require('../../../core/server/services/stripe');
        stripeService.api._configured = true;
        const fakePrice = {
            id: 'price_1',
            product: '',
            active: true,
            nickname: 'Complimentary',
            unit_amount: 0,
            currency: 'USD',
            type: 'recurring',
            recurring: {
                interval: 'year'
            }
        };
        const fakeSubscription = {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            metadata: {},
            current_period_end: Date.now() / 1000,
            start_date: Date.now() / 1000,
            plan: fakePrice,
            items: {
                data: [{
                    price: fakePrice
                }]
            }
        };
        sinon.stub(stripeService.api, 'createCustomer').callsFake(async function (data) {
            return {
                id: 'cus_1',
                email: data.email
            };
        });
        sinon.stub(stripeService.api, 'createPrice').resolves(fakePrice);
        sinon.stub(stripeService.api, 'createSubscription').resolves(fakeSubscription);
        sinon.stub(stripeService.api, 'getSubscription').resolves(fakeSubscription);
        const initialMember = {
            name: 'Name',
            email: 'compedtest@test.com',
            subscribed: true
        };

        const compedPayload = {
            comped: true
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        const newMember = body.members[0];

        const {body: body2} = await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        stripeService.api._configured = false;
    });

    it('Can edit by id', async function () {
        const memberToChange = {
            name: 'change me',
            email: 'member2Change@test.com',
            note: 'initial note',
            subscribed: true
        };

        const memberChanged = {
            name: 'changed',
            email: 'cantChangeMe@test.com',
            note: 'edited note',
            subscribed: false
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        const newMember = body.members[0];

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can destroy', async function () {
        const member = {
            name: 'test',
            email: 'memberTestDestroy@test.com'
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        const newMember = body.members[0];

        await agent
            .delete(`/members/${newMember.id}`)
            .expectStatus(204)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        await agent
            .get(`/members/${newMember.id}/`)
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can export CSV', async function () {
        const res = await agent
            .get(`/members/upload/`)
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyString //For some reason the content-length changes between 1220 and 1317
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });

    it('Can export a filtered CSV', async function () {
        const res = await agent
            .get(`/members/upload/?search=Egg`)
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.not.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.not.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.not.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });
});

//TODO: migrate once we have a way to attach files in the new e2e testing framework
// describe('Members API', function () {
//     let request;
//     before(async function () {
//         await localUtils.startGhost();
//         request = supertest.agent(config.get('url'));
//         await localUtils.doAuth(request, 'members', 'members:emails');
//     });

//     beforeEach(function () {
//         mockManager.mockLabsEnabled('multipleProducts');
//     });

//     afterEach(function () {
//         mockManager.restore();
//     });

//     it('Can import CSV', async function () {
//         const res = await request
//             .post(localUtils.API.getApiQuery(`members/upload/`))
//             .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/valid-members-import.csv'))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(201);

//         should.not.exist(res.headers['x-cache-invalidate']);
//         const jsonResponse = res.body;

//         should.exist(jsonResponse);
//         should.exist(jsonResponse.meta);
//         should.exist(jsonResponse.meta.stats);

//         jsonResponse.meta.stats.imported.should.equal(2);
//         jsonResponse.meta.stats.invalid.length.should.equal(0);
//         jsonResponse.meta.import_label.name.should.match(/^Import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

//         const importLabel = jsonResponse.meta.import_label;

//         // check that members had the auto-generated label attached
//         const res2 = await request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         const jsonResponse2 = res2.body;
//         should.exist(jsonResponse2);
//         should.exist(jsonResponse2.members);
//         jsonResponse2.members.should.have.length(2);

//         const importedMember1 = jsonResponse2.members.find(m => m.email === 'jbloggs@example.com');
//         should.exist(importedMember1);
//         importedMember1.name.should.equal('joe');
//         should(importedMember1.note).equal(null);
//         importedMember1.subscribed.should.equal(true);
//         importedMember1.labels.length.should.equal(1);
//         testUtils.API.isISO8601(importedMember1.created_at).should.be.true();
//         importedMember1.comped.should.equal(false);
//         importedMember1.subscriptions.should.not.be.undefined();
//         importedMember1.subscriptions.length.should.equal(0);

//         const importedMember2 = jsonResponse2.members.find(m => m.email === 'test@example.com');
//         should.exist(importedMember2);
//         importedMember2.name.should.equal('test');
//         should(importedMember2.note).equal('test note');
//         importedMember2.subscribed.should.equal(false);
//         importedMember2.labels.length.should.equal(2);
//         testUtils.API.isISO8601(importedMember2.created_at).should.be.true();
//         importedMember2.created_at.should.equal('1991-10-02T20:30:31.000Z');
//         importedMember2.comped.should.equal(false);
//         importedMember2.subscriptions.should.not.be.undefined();
//         importedMember2.subscriptions.length.should.equal(0);
//     });

//     it('Can import CSV and bulk destroy via auto-added label', function () {
//         // HACK: mock dates otherwise we'll often get unexpected members appearing
//         // from previous tests with the same import label due to auto-generated
//         // import labels only including minutes
//         sinon.stub(Date, 'now').returns(new Date('2021-03-30T17:21:00.000Z'));

//         // import our dummy data for deletion
//         return request
//             .post(localUtils.API.getApiQuery(`members/upload/`))
//             .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/valid-members-for-bulk-delete.csv'))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .then((res) => {
//                 should.not.exist(res.headers['x-cache-invalidate']);

//                 const jsonResponse = res.body;

//                 should.exist(jsonResponse);
//                 should.exist(jsonResponse.meta);
//                 should.exist(jsonResponse.meta.stats);
//                 should.exist(jsonResponse.meta.import_label);

//                 jsonResponse.meta.stats.imported.should.equal(8);

//                 return jsonResponse.meta.import_label;
//             })
//             .then((importLabel) => {
//                 // check that the import worked by checking browse response with filter
//                 return request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
//                     .set('Origin', config.get('url'))
//                     .expect('Content-Type', /json/)
//                     .expect('Cache-Control', testUtils.cacheRules.private)
//                     .expect(200)
//                     .then((res) => {
//                         should.not.exist(res.headers['x-cache-invalidate']);
//                         const jsonResponse = res.body;
//                         should.exist(jsonResponse);
//                         should.exist(jsonResponse.members);
//                         jsonResponse.members.should.have.length(8);
//                     })
//                     .then(() => importLabel);
//             })
//             .then((importLabel) => {
//                 // perform the bulk delete
//                 return request
//                     .del(localUtils.API.getApiQuery(`members/?filter=label:'${importLabel.slug}'`))
//                     .set('Origin', config.get('url'))
//                     .expect('Content-Type', /json/)
//                     .expect('Cache-Control', testUtils.cacheRules.private)
//                     .expect(200)
//                     .then((res) => {
//                         should.not.exist(res.headers['x-cache-invalidate']);
//                         const jsonResponse = res.body;
//                         should.exist(jsonResponse);
//                         should.exist(jsonResponse.meta);
//                         should.exist(jsonResponse.meta.stats);
//                         should.exist(jsonResponse.meta.stats.successful);
//                         should.equal(jsonResponse.meta.stats.successful, 8);
//                     })
//                     .then(() => importLabel);
//             })
//             .then((importLabel) => {
//                 // check that the bulk delete worked by checking browse response with filter
//                 return request.get(localUtils.API.getApiQuery(`members/?filter=label:${importLabel.slug}`))
//                     .set('Origin', config.get('url'))
//                     .expect('Content-Type', /json/)
//                     .expect('Cache-Control', testUtils.cacheRules.private)
//                     .expect(200)
//                     .then((res) => {
//                         const jsonResponse = res.body;
//                         should.exist(jsonResponse);
//                         should.exist(jsonResponse.members);
//                         jsonResponse.members.should.have.length(0);
//                     });
//             });
//     });

//     it('Can bulk unsubscribe members with filter', async function () {
//         // import our dummy data for deletion
//         await request
//             .post(localUtils.API.getApiQuery(`members/upload/`))
//             .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/members-for-bulk-unsubscribe.csv'))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private);

//         const browseResponse = await request
//             .get(localUtils.API.getApiQuery('members/?filter=label:bulk-unsubscribe-test'))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         browseResponse.body.members.should.have.length(8);
//         const allMembersSubscribed = browseResponse.body.members.every((member) => {
//             return member.subscribed;
//         });

//         should.ok(allMembersSubscribed);

//         const bulkUnsubscribeResponse = await request
//             .put(localUtils.API.getApiQuery('members/bulk/?filter=label:bulk-unsubscribe-test'))
//             .set('Origin', config.get('url'))
//             .send({
//                 bulk: {
//                     action: 'unsubscribe'
//                 }
//             })
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         should.exist(bulkUnsubscribeResponse.body.bulk);
//         should.exist(bulkUnsubscribeResponse.body.bulk.meta);
//         should.exist(bulkUnsubscribeResponse.body.bulk.meta.stats);
//         should.exist(bulkUnsubscribeResponse.body.bulk.meta.stats.successful);
//         should.equal(bulkUnsubscribeResponse.body.bulk.meta.stats.successful, 8);

//         const postUnsubscribeBrowseResponse = await request
//             .get(localUtils.API.getApiQuery('members/?filter=label:bulk-unsubscribe-test'))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         postUnsubscribeBrowseResponse.body.members.should.have.length(8);
//         const allMembersUnsubscribed = postUnsubscribeBrowseResponse.body.members.every((member) => {
//             return !member.subscribed;
//         });

//         should.ok(allMembersUnsubscribed);
//     });

//     it('Can bulk add and remove labels to members with filter', async function () {
//         // import our dummy data for deletion
//         await request
//             .post(localUtils.API.getApiQuery('members/upload/'))
//             .attach('membersfile', path.join(__dirname, '/../../utils/fixtures/csv/members-for-bulk-add-labels.csv'))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private);

//         const newLabelResponse = await request
//             .post(localUtils.API.getApiQuery('labels'))
//             .set('Origin', config.get('url'))
//             .send({
//                 labels: [{
//                     name: 'Awesome Label For Testing Bulk Add'
//                 }]
//             });

//         const labelToAdd = newLabelResponse.body.labels[0];

//         const bulkAddLabelResponse = await request
//             .put(localUtils.API.getApiQuery('members/bulk/?filter=label:bulk-add-labels-test'))
//             .set('Origin', config.get('url'))
//             .send({
//                 bulk: {
//                     action: 'addLabel',
//                     meta: {
//                         label: labelToAdd
//                     }
//                 }
//             })
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         should.exist(bulkAddLabelResponse.body.bulk);
//         should.exist(bulkAddLabelResponse.body.bulk.meta);
//         should.exist(bulkAddLabelResponse.body.bulk.meta.stats);
//         should.exist(bulkAddLabelResponse.body.bulk.meta.stats.successful);
//         should.equal(bulkAddLabelResponse.body.bulk.meta.stats.successful, 8);

//         const postLabelAddBrowseResponse = await request
//             .get(localUtils.API.getApiQuery(`members/?filter=label:${labelToAdd.slug}`))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         postLabelAddBrowseResponse.body.members.should.have.length(8);

//         const labelToRemove = newLabelResponse.body.labels[0];

//         const bulkRemoveLabelResponse = await request
//             .put(localUtils.API.getApiQuery('members/bulk/?filter=label:bulk-add-labels-test'))
//             .set('Origin', config.get('url'))
//             .send({
//                 bulk: {
//                     action: 'removeLabel',
//                     meta: {
//                         label: labelToRemove
//                     }
//                 }
//             })
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         should.exist(bulkRemoveLabelResponse.body.bulk);
//         should.exist(bulkRemoveLabelResponse.body.bulk.meta);
//         should.exist(bulkRemoveLabelResponse.body.bulk.meta.stats);
//         should.exist(bulkRemoveLabelResponse.body.bulk.meta.stats.successful);
//         should.equal(bulkRemoveLabelResponse.body.bulk.meta.stats.successful, 8);

//         const postLabelRemoveBrowseResponse = await request
//             .get(localUtils.API.getApiQuery(`members/?filter=label:${labelToRemove.slug}`))
//             .set('Origin', config.get('url'))
//             .expect('Content-Type', /json/)
//             .expect('Cache-Control', testUtils.cacheRules.private)
//             .expect(200);

//         postLabelRemoveBrowseResponse.body.members.should.have.length(0);
//     });
// });
