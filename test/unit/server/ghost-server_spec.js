const should = require('should');
const sinon = require('sinon');

const configUtils = require('../../utils/configUtils');
const {events} = require('../../../core/server/lib/common');

const bootstrapSocket = require('@tryghost/bootstrap-socket');

describe('GhostServer', function () {
    describe('announceServerReadiness', function () {
        let GhostServer;
        let socketStub;
        let eventSpy;

        beforeEach(function () {
            // Have to re-require each time to clear the internal flag
            delete require.cache[require.resolve('../../../core/server/ghost-server')];
            GhostServer = require('../../../core/server/ghost-server');

            // process.send isn't set for tests, we can safely override;
            process.send = sinon.stub();

            // stub socket connectAndSend method
            socketStub = sinon.stub(bootstrapSocket, 'connectAndSend');

            // Spy for the events that get called
            eventSpy = sinon.spy(events, 'emit');
        });

        afterEach(function () {
            process.send = undefined;
            configUtils.restore();
            socketStub.restore();
            eventSpy.restore();
        });

        it('it resolves a promise', function () {
            GhostServer.announceServerReadiness().should.be.fulfilled();
        });

        it('it communicates with IPC correctly on success', function () {
            GhostServer.announceServerReadiness();

            process.send.calledOnce.should.be.true();

            let message = process.send.firstCall.args[0];
            message.should.be.an.Object().with.properties('started', 'debug');
            message.should.not.have.property('error');
            message.started.should.be.true();
        });

        it('communicates with IPC correctly on failure', function () {
            GhostServer.announceServerReadiness(new Error('something went wrong'));

            process.send.calledOnce.should.be.true();

            let message = process.send.firstCall.args[0];
            message.should.be.an.Object().with.properties('started', 'debug', 'error');
            message.started.should.be.false();
            message.error.should.be.an.Object().with.properties('message');
            message.error.message.should.eql('something went wrong');
        });

        it('communicates via bootstrap socket correctly on success', function () {
            configUtils.set('bootstrap-socket', 'testing');

            GhostServer.announceServerReadiness();

            socketStub.calledOnce.should.be.true();
            socketStub.firstCall.args[0].should.eql('testing');
            socketStub.firstCall.args[1].should.be.an.Object().with.properties('info', 'warn');

            let message = socketStub.firstCall.args[2];
            message.should.be.an.Object().with.properties('started', 'debug');
            message.should.not.have.property('error');
            message.started.should.be.true();
        });

        it('communicates via bootstrap socket correctly on failure', function () {
            configUtils.set('bootstrap-socket', 'testing');

            GhostServer.announceServerReadiness(new Error('something went wrong'));

            socketStub.calledOnce.should.be.true();
            socketStub.firstCall.args[0].should.eql('testing');
            socketStub.firstCall.args[1].should.be.an.Object().with.properties('info', 'warn');

            let message = socketStub.firstCall.args[2];
            message.should.be.an.Object().with.properties('started', 'debug', 'error');
            message.started.should.be.false();
            message.error.should.be.an.Object().with.properties('message');
            message.error.message.should.eql('something went wrong');
        });

        it('can be called multiple times, but only communicates once', function () {
            configUtils.set('bootstrap-socket', 'testing');

            GhostServer.announceServerReadiness();
            GhostServer.announceServerReadiness(new Error('something went wrong'));
            GhostServer.announceServerReadiness();

            process.send.calledOnce.should.be.true();
            socketStub.calledOnce.should.be.true();
        });

        it('sends server.start event correctly on success', function () {
            GhostServer.announceServerReadiness();

            eventSpy.calledOnce.should.be.true();
            eventSpy.firstCall.args[0].should.eql('server.start');
        });

        it('does not send server.start event on failure', function () {
            GhostServer.announceServerReadiness(new Error('something went wrong'));

            eventSpy.calledOnce.should.be.false();
        });
    });
});
