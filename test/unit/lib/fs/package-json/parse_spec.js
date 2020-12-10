const should = require('should');
const tmp = require('tmp');
const fs = require('fs-extra');
const PackageJSON = require('../../../../../core/server/lib/fs/package-json/package-json');

const packageJSON = new PackageJSON({
    i18n: {
        t: key => key
    }
});

describe('lib/fs/package-json: parse', function () {
    it('should parse valid package.json', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = JSON.stringify({
            name: 'test',
            version: '0.0.0'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        packageJSON.parse(tmpFile.name)
            .then(function (pkg) {
                pkg.should.eql({
                    name: 'test',
                    version: '0.0.0'
                });

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when name is missing', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = JSON.stringify({
            version: '0.0.0'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        packageJSON.parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                err.message.should.equal('errors.utils.parsepackagejson.nameOrVersionMissing');
                err.context.should.equal(tmpFile.name);
                err.help.should.equal('errors.utils.parsepackagejson.willBeRequired');

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when version is missing', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = JSON.stringify({
            name: 'test'
        });

        fs.writeSync(tmpFile.fd, pkgJson);

        packageJSON.parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                err.message.should.equal('errors.utils.parsepackagejson.nameOrVersionMissing');
                err.context.should.equal(tmpFile.name);
                err.help.should.equal('errors.utils.parsepackagejson.willBeRequired');

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when JSON is invalid', function (done) {
        let pkgJson;
        let tmpFile;

        tmpFile = tmp.fileSync();
        pkgJson = '{name:"test"}';

        fs.writeSync(tmpFile.fd, pkgJson);

        packageJSON.parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                err.message.should.equal('errors.utils.parsepackagejson.themeFileIsMalformed');
                err.context.should.equal(tmpFile.name);
                err.help.should.equal('errors.utils.parsepackagejson.willBeRequired');

                done();
            })
            .catch(done)
            .finally(tmpFile.removeCallback);
    });

    it('should fail when file is missing', function (done) {
        const tmpFile = tmp.fileSync();

        tmpFile.removeCallback();
        packageJSON.parse(tmpFile.name)
            .then(function () {
                done(new Error('packageJSON.parse succeeded, but should\'ve failed'));
            })
            .catch(function (err) {
                err.message.should.equal('errors.utils.parsepackagejson.couldNotReadPackage');
                err.context.should.equal(tmpFile.name);

                done();
            })
            .catch(done);
    });
});
