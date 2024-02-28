import assert from 'assert/strict';
import sinon from 'sinon';
import HttpContext from '../src/HttpContext';

describe('HttpContext', function () {
    it('can store a value and retrieve it', function (done) {
        const key = 'key';
        const value = 'value';

        HttpContext.start(() => {
            HttpContext.set(key, value);

            assert.equal(HttpContext.get(key), value);

            done();
        });
    });

    it('disposes of stored values when ended', function (done) {
        const key = 'key';
        const value = 'value';
        const disposeValue = sinon.stub();

        HttpContext.start(() => {
            HttpContext.set(key, value, disposeValue);

            HttpContext.end();

            assert.ok(disposeValue.calledOnce);
            assert.ok(disposeValue.calledWith(value));

            done();
        });
    });
});
