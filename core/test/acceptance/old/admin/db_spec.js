const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../../server/config');
const models = require('../../../../server/models');
const common = require('../../../../server/lib/common');
const testUtils = require('../../../utils');
const localUtils = require('./utils');

let ghost = testUtils.startGhost;
let request;
let eventsTriggered;

describe('DB API', () => {
    let backupClient;
    let schedulerClient;

    before(() => {
        return ghost()
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            })
            .then(() => {
                return models.Client.findAll();
            })
            .then((result) => {
                const clients = result.toJSON();
                backupClient = _.find(clients, {slug: 'ghost-backup'});
                schedulerClient = _.find(clients, {slug: 'ghost-scheduler'});
            });
    });

    beforeEach(() => {
        eventsTriggered = {};

        sinon.stub(common.events, 'emit').callsFake((eventName, eventObj) => {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('Can export a JSON database', () => {
        return request.get(localUtils.API.getApiQuery(`db/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .expect('Content-Disposition', /Attachment; filename="[A-Za-z0-9._-]+\.json"/)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                should.exist(res.headers['content-disposition']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                Object.keys(jsonResponse.db[0].data).length.should.eql(25);
            });
    });

    it('Can import a JSON database', () => {
        return Promise.resolve()
            .then(() => {
                return request.delete(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect(204);
            })
            .then(() => {
                return request.post(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/export/default_export.json'))
                    .expect(200)
                    .then((res) => {
                        const jsonResponse = res.body;
                        should.exist(jsonResponse.db);
                        should.exist(jsonResponse.problems);
                        jsonResponse.problems.should.have.length(3);
                    });
            })
            .then(() => {
                return request.get(localUtils.API.getApiQuery('posts/'))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        let jsonResponse = res.body;
                        let results = jsonResponse.posts;
                        jsonResponse.posts.should.have.length(7);
                        _.filter(results, {page: false, status: 'published'}).length.should.equal(7);
                    });
            });
    });

    it('Can delete all content', () => {
        return request
            .get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                let jsonResponse = res.body;
                let results = jsonResponse.posts;
                jsonResponse.posts.should.have.length(7);
                _.filter(results, {page: false, status: 'published'}).length.should.equal(7);
            })
            .then(() => {
                return request.delete(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect(204);
            })
            .then(() => {
                return request.get(localUtils.API.getApiQuery('posts/'))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        res.body.posts.should.have.length(0);
                        eventsTriggered['post.unpublished'].length.should.eql(7);
                        eventsTriggered['post.deleted'].length.should.eql(7);
                        eventsTriggered['tag.deleted'].length.should.eql(1);
                    });
            });
    });
});
