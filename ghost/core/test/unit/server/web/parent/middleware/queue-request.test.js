const assert = require('node:assert');
const sinon = require('sinon');

const queueRequest = require('../../../../../../core/server/web/parent/middleware/queue-request');

describe('Queue request middleware', function () {
    let req, res, next, config, queueFactory, queue;

    beforeEach(function () {
        req = {};
        res = {};
        next = sinon.stub();
        config = {};

        queue = sinon.stub();
        queue.queue = {
            on: sinon.stub(),
        };

        queueFactory = sinon.stub().returns(queue);
    });

    it('should not queue requests for static assets', function () {
        const staticAssetPaths = [
            '/foo/bar.css',
            '/foo/bar.js',
            '/foo/bar.map',
            '/foo/bar.woff2',
            '/foo/bar.ico'
        ];

        const mw = queueRequest(config, queueFactory);

        for (const path of staticAssetPaths) {
            req.path = path;

            mw(req, res, next);
        }

        assert.equal(queue.callCount, 0, 'queueFactory should not be called');
        assert.equal(next.callCount, staticAssetPaths.length, 'next should be called for each static asset');
    });

    it('should configure the queue using the default queue limit', function () {
        queueRequest(config, queueFactory);

        assert.deepEqual(queueFactory.callCount, 1, 'queueFactory should be called once');
        assert.deepEqual(queueFactory.getCall(0).args[0], {
            activeLimit: queueRequest.DEFAULT_QUEUE_LIMIT,
            queuedLimit: -1
        }, 'queueFactory should be called with the default queue limit');
    });

    it('should configure the queue using the queue limit defined in the config', function () {
        config.limit = 123;

        queueRequest(config, queueFactory);

        assert.deepEqual(queueFactory.callCount, 1, 'queueFactory should be called once');
        assert.deepEqual(queueFactory.getCall(0).args[0], {
            activeLimit: config.limit,
            queuedLimit: -1
        }, 'queueFactory should be called with the queue limit from the config');
    });

    it('should queue the request', function () {
        req.path = '/foo/bar';

        const mw = queueRequest(config, queueFactory);

        mw(req, res, next);

        assert(queue.calledOnce, 'queue should be called once');
        assert(queue.calledWith(req, res, next), 'queue should be called with the correct arguments');
    });

    it('should log metrics when a request is queued', function () {
        const queueEvent = 'queue';
        const queueLength = 123;
        const logMetric = sinon.stub();

        // Assert event listener is added
        queueRequest(config, queueFactory, logMetric);

        assert(queue.queue.on.calledWith(queueEvent), `"${queueEvent}" event listener should be added`);

        // Assert event listener implementation
        const listener = queue.queue.on.args.find(arg => arg[0] === queueEvent)[1];

        listener({
            data: {
                req: {
                    path: '/foo/bar'
                }
            },
            queue: {
                getLength() {
                    return queueLength;
                }
            }
        });

        assert(logMetric.calledOnce, 'logMetric should be called once');
        assert(
            logMetric.calledWith(
                'request-queue',
                {
                    event: 'request-queued',
                    queueLength: queueLength
                }
            ),
            'logMetric should be called with the correct arguments'
        );
    });

    it('should log metrics when a request has completed', function () {
        const queueEvent = 'complete';
        const queueLength = 123;
        const logMetric = sinon.stub();

        // Assert event listener is added
        queueRequest(config, queueFactory, logMetric);

        assert(queue.queue.on.calledWith(queueEvent), `"${queueEvent}" event listener should be added`);

        const listener = queue.queue.on.args.find(arg => arg[0] === queueEvent)[1];

        // Assert event listener implementation
        listener({
            data: {
                req: {
                    path: '/foo/bar'
                }
            },
            queue: {
                getLength() {
                    return queueLength;
                }
            }
        });

        assert(logMetric.calledOnce, 'logMetric should be called once');
        assert(
            logMetric.calledWith(
                'request-queue',
                {
                    event: 'request-completed',
                    queueLength: queueLength
                }
            ),
            'logMetric should be called with the correct arguments'
        );
    });
});
