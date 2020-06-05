import $ from 'jquery';
import Pretender from 'pretender';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, findAll, render, settled, triggerEvent} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
import {run} from '@ember/runloop';
import {setupRenderingTest} from 'ember-mocha';

const notificationsStub = Service.extend({
    showAPIError() {
        // noop - to be stubbed
    }
});

const stubSuccessfulUpload = function (server, delay = 0) {
    server.post('/ghost/api/v3/admin/members/csv/', function () {
        return [200, {'Content-Type': 'application/json'}, '{"url":"/content/images/test.png"}'];
    }, delay);
};

const stubFailedUpload = function (server, code, error, delay = 0) {
    server.post('/ghost/api/v3/admin/members/csv/', function () {
        return [code, {'Content-Type': 'application/json'}, JSON.stringify({
            errors: [{
                type: error,
                message: `Error: ${error}`
            }]
        })];
    }, delay);
};

describe('Integration: Component: modal-import-members-test', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
        this.set('uploadUrl', '/ghost/api/v3/admin/members/csv/');

        this.owner.register('service:notifications', notificationsStub);
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', async function () {
        await render(hbs`{{modal-import-members}}`);

        expect(find('h1').textContent.trim(), 'default header')
            .to.equal('Import');
        expect(find('.description').textContent.trim(), 'upload label')
            .to.equal('Select or drag-and-drop a CSV File');
    });

    it('generates request to supplied endpoint', async function () {
        stubSuccessfulUpload(server);

        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});

        expect(find('label').textContent.trim(), 'labels label')
            .to.equal('Labels');
        expect(find('.gh-btn-green').textContent).to.equal('Import');

        await click('.gh-btn-green');

        expect(server.handledRequests.length).to.equal(1);
        expect(server.handledRequests[0].url).to.equal('/ghost/api/v3/admin/members/csv/');
    });

    it('displays server error', async function () {
        stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });

    it('displays file too large for server error', async function () {
        stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file you uploaded was larger/);
    });

    it('handles file too large error directly from the web server', async function () {
        server.post('/ghost/api/v3/admin/members/csv/', function () {
            return [413, {}, ''];
        });
        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file you uploaded was larger/);
    });

    it('displays other server-side error with message', async function () {
        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/Error: UnknownError/);
    });

    it('handles unknown failure', async function () {
        server.post('/ghost/api/v3/admin/members/csv/', function () {
            return [500, {'Content-Type': 'application/json'}, ''];
        });
        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/Something went wrong/);
    });

    it('triggers notifications.showAPIError for VersionMismatchError', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'VersionMismatchError');

        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(showAPIError.calledOnce).to.be.true;
    });

    it('doesn\'t trigger notifications.showAPIError for other errors', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{modal-import-members}}`);
        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(showAPIError.called).to.be.false;
    });

    it('handles drag over/leave', async function () {
        await render(hbs`{{modal-import-members}}`);

        run(() => {
            // eslint-disable-next-line new-cap
            let dragover = $.Event('dragover', {
                dataTransfer: {
                    files: []
                }
            });
            $(find('.gh-image-uploader')).trigger(dragover);
        });

        await settled();

        expect(find('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.true;

        await triggerEvent('.gh-image-uploader', 'dragleave');

        expect(find('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.false;
    });

    it('validates extension by default', async function () {
        stubSuccessfulUpload(server);

        await render(hbs`{{modal-import-members}}`);

        await fileUpload('input[type="file"]', ['membersfile'], {name: 'test.txt'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
});
