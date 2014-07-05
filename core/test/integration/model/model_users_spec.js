/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../../utils'),
    should = require('should'),
    when = require('when'),
    _ = require('lodash'),
    errors = require('../../../server/errors'),
    sinon = require('sinon'),
    uuid = require('node-uuid'),

    // Stuff we are testing
    Models = require('../../../server/models');


describe('User Model', function run() {
    var UserModel = Models.User;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    describe('Registration', function runRegistration() {
        beforeEach(function (done) {
            testUtils.initData().then(function () {
                done();
            }).catch(done);
        });

        it('can add first', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0],
                gravatarStub =  sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    return when.resolve(userData);
                });

            UserModel.add(userData, {user: 1}).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                createdUser.attributes.password.should.not.equal(userData.password, "password was hashed");
                createdUser.attributes.email.should.eql(userData.email, "email address correct");
                gravatarStub.restore();
                done();
            }).catch(done);
        });

        it('does NOT lowercase email', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[2],
                gravatarStub =  sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    return when.resolve(userData);
                });

            UserModel.add(userData, {user: 1}).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                createdUser.attributes.email.should.eql(userData.email, "email address correct");
                gravatarStub.restore();
                done();
            }).catch(done);
        });

        it('can find gravatar', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4],
                gravatarStub = sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    userData.image = 'http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404';
                    return when.resolve(userData);
                });

            UserModel.add(userData, {user: 1}).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                createdUser.attributes.image.should.eql('http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404', 'Gravatar found');
                gravatarStub.restore();
                done();
            }).catch(done);
        });

        it('can handle no gravatar', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0],
                gravatarStub = sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    return when.resolve(userData);
                });

            UserModel.add(userData, {user: 1}).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                should.not.exist(createdUser.image);
                gravatarStub.restore();
                done();
            }).catch(done);
        });

        it('can find by email and is case insensitive', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[2],
                email = testUtils.DataGenerator.forModel.users[2].email;

            UserModel.add(userData, {user: 1}).then(function () {
                // Test same case
                return UserModel.getByEmail(email).then(function (user) {
                    should.exist(user);
                    user.attributes.email.should.eql(email);
                });
            }).then(function () {
                // Test entered in lowercase
                return UserModel.getByEmail(email.toLowerCase()).then(function (user) {
                    should.exist(user);
                    user.attributes.email.should.eql(email);
                });
            }).then(function () {
                // Test entered in uppercase
                return UserModel.getByEmail(email.toUpperCase()).then(function (user) {
                    should.exist(user);
                    user.attributes.email.should.eql(email);
                });
            }).then(function () {
                // Test incorrect email address - swapped capital O for number 0
                return UserModel.getByEmail('jb0gendAth@example.com').then(null, function (error) {
                    should.exist(error);
                    error.message.should.eql('NotFound');
                });
            }).then(function () {
                done();
            }).catch(done);
        });
    });

    describe('Basic Operations', function () {

        beforeEach(function (done) {
            testUtils.initData()
                .then(function () {
                    return when(testUtils.insertDefaultUser());
                })
                .then(function () {
                    done();
                }).catch(done);
        });

        it('sets last login time on successful login', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.check({email: userData.email, password: userData.password}).then(function (activeUser) {
                should.exist(activeUser.get('last_login'));
                done();
            }).catch(done);
        });

        it('converts fetched dateTime fields to Date objects', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.check({ email: userData.email, password: userData.password }).then(function (user) {
                return UserModel.findOne({ id: user.id });
            }).then(function (user) {
                var last_login,
                    created_at,
                    updated_at;

                should.exist(user);

                last_login = user.get('last_login');
                created_at = user.get('created_at');
                updated_at = user.get('updated_at');

                last_login.should.be.an.instanceof(Date);
                created_at.should.be.an.instanceof(Date);
                updated_at.should.be.an.instanceof(Date);

                done();
            }).catch(done);
        });

        it('can findAll', function (done) {

            UserModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                done();

            }).catch(done);
        });

        it('can findOne', function (done) {
            var firstUser;

            UserModel.findAll().then(function (results) {
                should.exist(results);
                results.length.should.be.above(0);
                firstUser = results.models[0];

                return UserModel.findOne({email: firstUser.attributes.email});
            }).then(function (found) {
                should.exist(found);
                found.attributes.name.should.equal(firstUser.attributes.name);

                done();

            }).catch(done);

        });

        it('can edit', function (done) {
            var firstUser = 1;

            UserModel.findOne({id: firstUser}).then(function (results) {
                var user;
                should.exist(results);
                user = results.toJSON();
                user.id.should.equal(firstUser);
                should.equal(user.website, null);

                return UserModel.edit({website: 'some.newurl.com'}, {id: firstUser});
            }).then(function (edited) {
                should.exist(edited);
                edited.attributes.website.should.equal('some.newurl.com');

                done();

            }).catch(done);
        });

        it('can destroy', function (done) {
            var firstUser = {id: 1};

            // Test that we have the user we expect
            UserModel.findOne(firstUser).then(function (results) {

                var user;
                should.exist(results);
                user = results.toJSON();
                user.id.should.equal(firstUser.id);

                // Destroy the user
                return UserModel.destroy(firstUser);
            }).then(function (response) {
                response.toJSON().should.be.empty;

                // Double check we can't find the user again
                return UserModel.findOne(firstUser);
            }).then(function (newResults) {
                should.equal(newResults, null);

                done();
            }).catch(done);
        });
    });

    describe('Password Reset', function () {

       beforeEach(function (done) {
           testUtils.initData()
               .then(function () {
                   return when(testUtils.insertDefaultUser());
               })
               .then(function () {
                   done();
               }).catch(done);
       });

        it('can generate reset token', function (done) {
            // Expires in one minute
            var expires = Date.now() + 60000,
                dbHash = uuid.v4();

            UserModel.findAll().then(function (results) {

                return UserModel.generateResetToken(results.models[0].attributes.email, expires, dbHash);

            }).then(function (token) {
                should.exist(token);

                token.length.should.be.above(0);

                done();
            }).catch(done);
        });

        it('can validate a reset token', function (done) {
            // Expires in one minute
            var expires = Date.now() + 60000,
                dbHash = uuid.v4();

            UserModel.findAll().then(function (results) {

                return UserModel.generateResetToken(results.models[0].attributes.email, expires, dbHash);

            }).then(function (token) {

                return UserModel.validateToken(token, dbHash);

            }).then(function () {

                done();

            }).catch(done);
        });

        it('can reset a password with a valid token', function (done) {
            // Expires in one minute
            var origPassword,
                expires = Date.now() + 60000,
                dbHash = uuid.v4();

            UserModel.findAll().then(function (results) {

                var firstUser = results.models[0],
                    origPassword = firstUser.attributes.password;

                should.exist(origPassword);

                return UserModel.generateResetToken(firstUser.attributes.email, expires, dbHash);

            }).then(function (token) {

                return UserModel.resetPassword(token, 'newpassword', 'newpassword', dbHash);

            }).then(function (resetUser) {
                var resetPassword = resetUser.get('password');

                should.exist(resetPassword);

                resetPassword.should.not.equal(origPassword);

                done();
            }).catch(done);
        });

        it('doesn\'t allow expired timestamp tokens', function (done) {
            var email,
                // Expired one minute ago
                expires = Date.now() - 60000,
                dbHash = uuid.v4();

            UserModel.findAll().then(function (results) {

                // Store email for later
                email = results.models[0].attributes.email;

                return UserModel.generateResetToken(email, expires, dbHash);

            }).then(function (token) {
                return UserModel.validateToken(token, dbHash);
            }).then(function () {
                throw new Error("Allowed expired token");
            }).catch(function (err) {

                should.exist(err);

                err.message.should.equal("Expired token");

                done();
            });
        });

        it('doesn\'t allow tampered timestamp tokens', function (done) {
            // Expired one minute ago
            var expires = Date.now() - 60000,
                dbHash = uuid.v4();

            UserModel.findAll().then(function (results) {

                return UserModel.generateResetToken(results.models[0].attributes.email, expires, dbHash);

            }).then(function (token) {

                var tokenText = new Buffer(token, 'base64').toString('ascii'),
                    parts = tokenText.split('|'),
                    fakeExpires,
                    fakeToken;

                fakeExpires = Date.now() + 60000;

                fakeToken = [String(fakeExpires), parts[1], parts[2]].join('|');
                fakeToken = new Buffer(fakeToken).toString('base64');

                return UserModel.validateToken(fakeToken, dbHash);

            }).then(function () {
                throw new Error("allowed invalid token");
            }).catch(function (err) {

                should.exist(err);

                err.message.should.equal("Invalid token");

                done();
            });
        });
    });

});
