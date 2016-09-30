var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    crypto = require('crypto'),
    fs = require('fs'),

    // Stuff we are testing
    db = require('../../server/data/db'),
    errors = require('../../server/errors'),
    models = require('../../server/models'),
    exporter = require('../../server/data/export'),
    schema = require('../../server/data/schema'),

    migration = rewire('../../server/data/migration'),
    fixtures = require('../../server/data/migration/fixtures'),
    populate = require('../../server/data/migration/populate'),
    update = rewire('../../server/data/migration/update'),
    updates004 = require('../../server/data/migration/004'),
    updates005 = require('../../server/data/migration/005'),
    updates008 = require('../../server/data/migration/008'),

    defaultSettings = schema.defaultSettings,
    schemaTables = Object.keys(schema.tables),

    sandbox = sinon.sandbox.create();

// Check version integrity
// These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
// without knowing that they also need to update the default database version,
// both of which are required for migrations to work properly.
describe('DB version integrity', function () {
    // Only these variables should need updating
    var currentDbVersion = '009',
        currentSchemaHash = 'b3bdae210526b2d4393359c3e45d7f83',
        currentFixturesHash = '30b0a956b04e634e7f2cddcae8d2fd20';

    // If this test is failing, then it is likely a change has been made that requires a DB version bump,
    // and the values above will need updating as confirmation
    it('should not change without fixing this test', function () {
        var tablesNoValidation = _.cloneDeep(schema.tables),
            schemaHash,
            fixturesHash;

        _.each(tablesNoValidation, function (table) {
            return _.each(table, function (column, name) {
                table[name] = _.omit(column, 'validations');
            });
        });

        schemaHash = crypto.createHash('md5').update(JSON.stringify(tablesNoValidation)).digest('hex');
        fixturesHash = crypto.createHash('md5').update(JSON.stringify(fixtures.fixtures)).digest('hex');

        // Test!
        defaultSettings.core.databaseVersion.defaultValue.should.eql(currentDbVersion);
        schemaHash.should.eql(currentSchemaHash);
        fixturesHash.should.eql(currentFixturesHash);
        schema.versioning.canMigrateFromVersion.should.eql('003');
    });
});

describe('Migrations', function () {
    var loggerStub, resetLogger;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
        resetLogger();
    });

    beforeEach(function () {
        loggerStub = {
            info: sandbox.stub(),
            warn: sandbox.stub()
        };

        resetLogger = update.__set__('logger', loggerStub);
    });

    describe('Backup', function () {
        var exportStub, filenameStub, fsStub;

        beforeEach(function () {
            exportStub = sandbox.stub(exporter, 'doExport').returns(new Promise.resolve());
            filenameStub = sandbox.stub(exporter, 'fileName').returns(new Promise.resolve('test'));
            fsStub = sandbox.stub(fs, 'writeFile').yields();
        });

        it('should create a backup JSON file', function (done) {
            migration.backupDatabase(loggerStub).then(function () {
                exportStub.calledOnce.should.be.true();
                filenameStub.calledOnce.should.be.true();
                fsStub.calledOnce.should.be.true();
                loggerStub.info.calledTwice.should.be.true();

                done();
            }).catch(done);
        });

        it('should fall back to console.log if no logger provided', function (done) {
            var noopStub = sandbox.stub(_, 'noop');

            migration.backupDatabase().then(function () {
                exportStub.calledOnce.should.be.true();
                filenameStub.calledOnce.should.be.true();
                fsStub.calledOnce.should.be.true();
                noopStub.calledTwice.should.be.true();
                // restore early so we get the test output
                noopStub.restore();

                done();
            }).catch(done);
        });
    });

    describe('Reset', function () {
        var deleteStub;

        beforeEach(function () {
            deleteStub = sandbox.stub(schema.commands, 'deleteTable').returns(new Promise.resolve());
        });

        it('should delete all tables in reverse order', function (done) {
            migration.reset().then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length);
                // First call should be called with the last table
                deleteStub.firstCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call should be called with the first table
                deleteStub.lastCall.calledWith(schemaTables[0]).should.be.true();

                done();
            }).catch(done);
        });

        it('should delete all tables in reverse order when called twice in a row', function (done) {
            migration.reset().then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length);
                // First call should be called with the last table
                deleteStub.firstCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call should be called with the first table
                deleteStub.lastCall.calledWith(schemaTables[0]).should.be.true();

                return migration.reset();
            }).then(function (result) {
                should.exist(result);
                result.should.be.an.Array().with.lengthOf(schemaTables.length);

                deleteStub.called.should.be.true();
                deleteStub.callCount.should.be.eql(schemaTables.length * 2);
                // First call (second set) should be called with the last table
                deleteStub.getCall(schemaTables.length).calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                // Last call (second Set) should be called with the first table
                deleteStub.getCall(schemaTables.length * 2 - 1).calledWith(schemaTables[0]).should.be.true();

                done();
            }).catch(done);
        });
    });

    describe('Populate', function () {
        var createStub, fixturesStub, populateSettingsStub;

        beforeEach(function () {
            fixturesStub = sandbox.stub(fixtures, 'populate').returns(new Promise.resolve());
            populateSettingsStub = sandbox.stub(models.Settings, 'populateDefaults').returns(new Promise.resolve());
        });

        it('should create all tables, and populate fixtures', function (done) {
            createStub = sandbox.stub(schema.commands, 'createTable').returns(new Promise.resolve());

            populate().then(function (result) {
                should.not.exist(result);

                populateSettingsStub.called.should.be.true();
                createStub.called.should.be.true();
                createStub.callCount.should.be.eql(schemaTables.length);
                createStub.firstCall.calledWith(schemaTables[0]).should.be.true();
                createStub.lastCall.calledWith(schemaTables[schemaTables.length - 1]).should.be.true();
                fixturesStub.calledOnce.should.be.true();
                done();
            }).catch(done);
        });

        it('should rollback if error occurs', function (done) {
            var i = 0;

            createStub = sandbox.stub(schema.commands, 'createTable', function () {
                i = i + 1;

                if (i > 10) {
                    return new Promise.reject(new Error('error on table creation :('));
                }

                return new Promise.resolve();
            });

            populate()
                .then(function () {
                    done(new Error('should throw an error for database population'));
                })
                .catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.InternalServerError).should.eql(true);
                    createStub.callCount.should.eql(11);
                    done();
                });
        });
    });

    describe('isDatabaseOutOfDate', function () {
        var updateDatabaseSchemaStub, updateDatabaseSchemaReset, versionsSpy;

        beforeEach(function () {
            versionsSpy = sandbox.spy(schema.versioning, 'getMigrationVersions');

            // For these tests, stub out the actual update task
            updateDatabaseSchemaStub = sandbox.stub().returns(new Promise.resolve());
            updateDatabaseSchemaReset = update.__set__('updateDatabaseSchema', updateDatabaseSchemaStub);
        });

        afterEach(function () {
            updateDatabaseSchemaReset();
        });

        it('should throw error if versions are too old', function () {
            var response = update.isDatabaseOutOfDate({fromVersion: '000', toVersion: '002'});
            updateDatabaseSchemaStub.calledOnce.should.be.false();
            (response.error instanceof errors.DatabaseVersion).should.eql(true);
        });

        it('should just return if versions are the same', function () {
            var migrateToDatabaseVersionStub = sandbox.stub().returns(new Promise.resolve()),
                migrateToDatabaseVersionReset = update.__set__('migrateToDatabaseVersion', migrateToDatabaseVersionStub),
                response = update.isDatabaseOutOfDate({fromVersion: '004', toVersion: '004'});

            response.migrate.should.eql(false);
            versionsSpy.calledOnce.should.be.false();
            migrateToDatabaseVersionStub.callCount.should.eql(0);
            migrateToDatabaseVersionReset();
        });

        it('should throw an error if the database version is higher than the default', function () {
            var response = update.isDatabaseOutOfDate({fromVersion: '010', toVersion: '004'});
            updateDatabaseSchemaStub.calledOnce.should.be.false();
            (response.error instanceof errors.DatabaseVersion).should.eql(true);
        });
    });

    describe('Update', function () {
        describe('Update function', function () {
            var resetBackup, backupStub, fixturesStub, setDbStub, versionsSpy, tasksSpy, transactionStub, transaction;

            beforeEach(function () {
                transaction = {
                    rollback: sandbox.stub(),
                    commit: sandbox.stub()
                };

                // Stubs
                backupStub = sandbox.stub().returns(new Promise.resolve());
                fixturesStub = sandbox.stub(fixtures, 'update').returns(new Promise.resolve());
                setDbStub = sandbox.stub(schema.versioning, 'setDatabaseVersion').returns(new Promise.resolve());

                transactionStub = sandbox.stub(db.knex, 'transaction', function (transactionStart) {
                    return new Promise(function () {
                        transactionStart(transaction);
                    });
                });

                // Spys
                versionsSpy = sandbox.spy(schema.versioning, 'getMigrationVersions');
                tasksSpy = sandbox.spy(schema.versioning, 'getUpdateDatabaseTasks');

                // Internal overrides
                resetBackup = update.__set__('backup', backupStub);
            });

            afterEach(function () {
                resetBackup();
            });

            describe('Pre & post update process', function () {
                var updateDatabaseSchemaStub, updateDatabaseSchemaReset;

                beforeEach(function () {
                    // For these tests, stub out the actual update task
                    updateDatabaseSchemaStub = sandbox.stub().returns(new Promise.resolve());
                    updateDatabaseSchemaReset = update.__set__('updateDatabaseSchema', updateDatabaseSchemaStub);
                });

                afterEach(function () {
                    updateDatabaseSchemaReset();
                });

                it('should attempt to run the pre & post update tasks correctly', function (done) {
                    // Execute
                    update.execute({fromVersion: '100', toVersion: '102'}).then(function () {
                        // getMigrationVersions should be called with the correct versions
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('100', '102').should.be.true();

                        // It should attempt to do a backup
                        backupStub.calledOnce.should.be.true();

                        // Now it's going to try to actually do the update...
                        updateDatabaseSchemaStub.calledTwice.should.be.true();
                        updateDatabaseSchemaStub.firstCall.calledWith([], loggerStub, {
                            transacting: transaction,
                            context: {internal: true}
                        }).should.be.true();
                        updateDatabaseSchemaStub.secondCall.calledWith([], loggerStub, {
                            transacting: transaction,
                            context: {internal: true}
                        }).should.be.true();

                        // Then fixture updates
                        fixturesStub.calledTwice.should.be.true();
                        // And finally, set the new DB version
                        setDbStub.calledTwice.should.be.true();

                        transaction.commit.called.should.eql(true);
                        transaction.rollback.called.should.eql(false);

                        // Just to be sure, lets assert the call order
                        sinon.assert.callOrder(
                            versionsSpy, backupStub, updateDatabaseSchemaStub, fixturesStub, setDbStub
                        );

                        done();
                    }).catch(done);
                });

                it('should upgrade from minimum version, if force migration is set', function (done) {
                    var migrateToDatabaseVersionStub = sandbox.stub().returns(new Promise.resolve()),
                        migrateToDatabaseVersionReset = update.__set__('migrateToDatabaseVersion', migrateToDatabaseVersionStub);

                    update.execute({fromVersion: '005', toVersion: '006', forceMigration: true}).then(function () {
                        // getMigrationVersions should be called with the correct versions
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('003', '006').should.be.true();
                        versionsSpy.returned(['003', '004', '005', '006']).should.be.true();

                        // It should try to do the update
                        migrateToDatabaseVersionStub.callCount.should.eql(3);
                        migrateToDatabaseVersionStub.firstCall.args[0].should.eql('004');
                        migrateToDatabaseVersionStub.secondCall.args[0].should.eql('005');
                        migrateToDatabaseVersionStub.thirdCall.args[0].should.eql('006');

                        migrateToDatabaseVersionReset();
                        done();
                    }).catch(done);
                });

                it('should do an UPDATE if newer database version is higher', function (done) {
                    var migrateToDatabaseVersionStub = sandbox.stub().returns(new Promise.resolve()),
                        migrateToDatabaseVersionReset = update.__set__('migrateToDatabaseVersion', migrateToDatabaseVersionStub);

                    update.execute({fromVersion: '004', toVersion: '005'}).then(function () {
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('004', '005').should.be.true();
                        versionsSpy.returned(['004', '005']).should.be.true();

                        migrateToDatabaseVersionStub.callCount.should.eql(1);
                        migrateToDatabaseVersionStub.firstCall.args[0].should.eql('005');

                        migrateToDatabaseVersionReset();

                        done();
                    }).catch(done);
                });

                it('should do an UPDATE if default version is significantly higher', function (done) {
                    var migrateToDatabaseVersionStub = sandbox.stub().returns(new Promise.resolve()),
                        migrateToDatabaseVersionReset = update.__set__('migrateToDatabaseVersion', migrateToDatabaseVersionStub);

                    update.execute({fromVersion: '004', toVersion: '010'}).then(function () {
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('004', '010').should.be.true();
                        versionsSpy.returned(['004', '005', '006', '007', '008', '009', '010']).should.be.true();

                        migrateToDatabaseVersionStub.callCount.should.eql(6);
                        migrateToDatabaseVersionStub.firstCall.args[0].should.eql('005');
                        migrateToDatabaseVersionStub.lastCall.args[0].should.eql('010');

                        migrateToDatabaseVersionReset();

                        done();
                    }).catch(done);
                });

                it('should do an UPDATE even if versions are the same, when FORCE_MIGRATION set', function (done) {
                    var migrateToDatabaseVersionStub = sandbox.stub().returns(new Promise.resolve()),
                        migrateToDatabaseVersionReset = update.__set__('migrateToDatabaseVersion', migrateToDatabaseVersionStub);

                    update.execute({fromVersion: '004', toVersion: '004', forceMigration: true}).then(function () {
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('003', '004').should.be.true();
                        versionsSpy.returned(['003', '004']).should.be.true();

                        migrateToDatabaseVersionStub.callCount.should.eql(1);
                        migrateToDatabaseVersionStub.firstCall.args[0].should.eql('004');
                        migrateToDatabaseVersionReset();

                        done();
                    }).catch(done);
                });
            });

            describe('Update to 004', function () {
                it('should call all the 004 database upgrade tasks', function (done) {
                    // Setup
                    // Create a new stub, this will replace sequence, so that db calls don't actually get run
                    var sequenceStub = sandbox.stub(),
                        sequenceReset = update.__set__('sequence', sequenceStub);

                    sequenceStub.returns(Promise.resolve([]));

                    // Execute
                    update.execute({fromVersion: '003', toVersion: '004'}).then(function () {
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('003', '004').should.be.true();

                        // returns the same, but get sliced afterwards!
                        versionsSpy.returned(['003', '004']).should.be.true();

                        tasksSpy.calledOnce.should.be.true();
                        tasksSpy.calledWith('004', loggerStub).should.be.true();
                        tasksSpy.firstCall.returnValue.should.be.an.Array().with.lengthOf(5);

                        transaction.commit.called.should.eql(true);
                        transaction.rollback.called.should.eql(false);

                        sequenceStub.calledOnce.should.be.true();

                        sequenceStub.firstCall.calledWith(sinon.match.array, {
                            transacting: transaction,
                            context: {
                                internal: true
                            }
                        }, loggerStub).should.be.true();

                        sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(5);
                        sequenceStub.firstCall.args[0][0].should.be.a.Function().with.property('name', 'addTourColumnToUsers');
                        sequenceStub.firstCall.args[0][1].should.be.a.Function().with.property('name', 'addSortOrderColumnToPostsTags');
                        sequenceStub.firstCall.args[0][2].should.be.a.Function().with.property('name', 'addManyColumnsToClients');
                        sequenceStub.firstCall.args[0][3].should.be.a.Function().with.property('name', 'addClientTrustedDomainsTable');
                        sequenceStub.firstCall.args[0][4].should.be.a.Function().with.property('name', 'dropUniqueOnClientsSecret');

                        // Reset sequence
                        sequenceReset();
                        done();
                    }).catch(done);
                });

                describe('Tasks:', function () {
                    var addColumnStub, createTableStub, getIndexesStub, dropUniqueStub,
                        knexStub, knexMock;

                    beforeEach(function () {
                        knexMock = sandbox.stub().returns({});
                        knexMock.schema = {
                            hasTable: sandbox.stub(),
                            hasColumn: sandbox.stub()
                        };
                        // this MUST use sinon, not sandbox, see sinonjs/sinon#781
                        knexStub = sinon.stub(db, 'knex', {
                            get: function () {
                                return knexMock;
                            }
                        });

                        addColumnStub = sandbox.stub(schema.commands, 'addColumn');
                        createTableStub = sandbox.stub(schema.commands, 'createTable');
                        getIndexesStub = sandbox.stub(schema.commands, 'getIndexes');
                        dropUniqueStub = sandbox.stub(schema.commands, 'dropUnique');
                    });

                    afterEach(function () {
                        knexStub.restore();
                    });

                    it('should have tasks for 004', function () {
                        should.exist(updates004);
                        updates004.should.be.an.Array().with.lengthOf(5);
                    });

                    describe('01-add-tour-column-to-users', function () {
                        var addTourColumn = updates004[0];

                        it('does not try to add a new column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(new Promise.resolve(false));

                            // Execute
                            addTourColumn({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.calledWith('users').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to add a new column if the column already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'tour').returns(new Promise.resolve(true));

                            // Execute
                            addTourColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'tour').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new column if table is present but column is not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'tour').returns(new Promise.resolve(false));

                            // Execute
                            addTourColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'tour').should.be.true();

                                addColumnStub.calledOnce.should.be.true();
                                addColumnStub.calledWith('users', 'tour').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('02-add-sortorder-column-to-poststags', function () {
                        var addSortOrderColumn = updates004[1];

                        it('does not try to add a new column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts_tags').returns(new Promise.resolve(false));

                            // Execute
                            addSortOrderColumn({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.calledWith('posts_tags').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to add a new column if the column already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts_tags').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts_tags', 'sort_order').returns(new Promise.resolve(true));

                            // Execute
                            addSortOrderColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts_tags').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts_tags', 'sort_order').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new column if table is present but column is not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts_tags').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts_tags', 'sort_order').returns(new Promise.resolve(false));

                            // Execute
                            addSortOrderColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts_tags').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts_tags', 'sort_order').should.be.true();

                                addColumnStub.calledOnce.should.be.true();
                                addColumnStub.calledWith('posts_tags', 'sort_order').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('03-add-many-columns-to-clients', function () {
                        var addClientColumns = updates004[2];

                        it('does not try to add new columns if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(false));

                            // Execute
                            addClientColumns({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to add new columns if the columns already exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'redirection_uri').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'logo').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'status').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'type').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'description').returns(new Promise.resolve(true));

                            // Execute
                            addClientColumns({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                knexMock.schema.hasColumn.callCount.should.eql(5);
                                knexMock.schema.hasColumn.calledWith('clients', 'redirection_uri').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'logo').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'status').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'type').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'description').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.callCount.should.eql(5);

                                done();
                            }).catch(done);
                        });

                        it('tries to add new columns if table is present but columns are not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'redirection_uri').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'logo').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'status').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'type').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'description').returns(new Promise.resolve(false));

                            // Execute
                            addClientColumns({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                knexMock.schema.hasColumn.callCount.should.eql(5);
                                knexMock.schema.hasColumn.calledWith('clients', 'redirection_uri').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'logo').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'status').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'type').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'description').should.be.true();

                                addColumnStub.callCount.should.eql(5);
                                addColumnStub.calledWith('clients', 'redirection_uri').should.be.true();
                                addColumnStub.calledWith('clients', 'logo').should.be.true();
                                addColumnStub.calledWith('clients', 'status').should.be.true();
                                addColumnStub.calledWith('clients', 'type').should.be.true();
                                addColumnStub.calledWith('clients', 'description').should.be.true();

                                loggerStub.info.callCount.should.eql(5);
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });

                        it('will only try to add columns that do not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'redirection_uri').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'logo').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'status').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('clients', 'type').returns(new Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('clients', 'description').returns(new Promise.resolve(true));

                            // Execute
                            addClientColumns({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                knexMock.schema.hasColumn.callCount.should.eql(5);
                                knexMock.schema.hasColumn.calledWith('clients', 'redirection_uri').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'logo').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'status').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'type').should.be.true();
                                knexMock.schema.hasColumn.calledWith('clients', 'description').should.be.true();

                                addColumnStub.callCount.should.eql(2);
                                addColumnStub.calledWith('clients', 'logo').should.be.true();
                                addColumnStub.calledWith('clients', 'type').should.be.true();

                                loggerStub.info.callCount.should.eql(2);
                                loggerStub.warn.callCount.should.eql(3);

                                done();
                            }).catch(done);
                        });
                    });

                    describe('04-add-clienttrusteddomains-table', function () {
                        var addTrustedDomains = updates004[3];

                        it('does not try to add a new table if the table already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('client_trusted_domains').returns(new Promise.resolve(true));

                            // Execute
                            addTrustedDomains({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.calledWith('client_trusted_domains').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.true();
                                    done();
                                })
                                .catch(done);
                        });

                        it('tries to add a new table if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('client_trusted_domains').returns(new Promise.resolve(false));

                            // Execute
                            addTrustedDomains({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('client_trusted_domains').should.be.true();

                                createTableStub.calledOnce.should.be.true();
                                createTableStub.calledWith('client_trusted_domains').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('05-drop-unique-on-clients-secret', function () {
                        var dropUnique = updates004[4];

                        it('does not try to drop unique if the table does not exist', function (done) {
                            // Setup
                            getIndexesStub.withArgs('clients').returns(new Promise.resolve(
                                ['clients_slug_unique', 'clients_name_unique', 'clients_secret_unique'])
                            );
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(false));

                            // Execute
                            dropUnique({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to drop unique if the index does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));

                            getIndexesStub.withArgs('clients').returns(new Promise.resolve(
                                ['clients_slug_unique', 'clients_name_unique'])
                            );

                            // Execute
                            dropUnique({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                getIndexesStub.calledOnce.should.be.true();
                                getIndexesStub.calledWith('clients').should.be.true();

                                dropUniqueStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a drop unique if table and index both exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('clients').returns(new Promise.resolve(true));

                            getIndexesStub.withArgs('clients').returns(new Promise.resolve(
                                ['clients_slug_unique', 'clients_name_unique', 'clients_secret_unique'])
                            );

                            // Execute
                            dropUnique({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('clients').should.be.true();

                                getIndexesStub.calledOnce.should.be.true();
                                getIndexesStub.calledWith('clients').should.be.true();

                                dropUniqueStub.calledOnce.should.be.true();
                                dropUniqueStub.calledWith('clients', 'secret').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });
                });
            });

            describe('Update to 005', function () {
                it('should call all the 005 database upgrade tasks', function (done) {
                    // Setup
                    // Create a new stub, this will replace sequence, so that db calls don't actually get run
                    var sequenceStub = sandbox.stub(),
                        sequenceReset = update.__set__('sequence', sequenceStub);

                    sequenceStub.returns(Promise.resolve([]));

                    // Execute
                    update.execute({fromVersion: '004', toVersion: '005'}).then(function () {
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('004', '005').should.be.true();
                        versionsSpy.returned(['004', '005']).should.be.true();

                        tasksSpy.calledOnce.should.be.true();
                        tasksSpy.calledWith('005', loggerStub).should.be.true();
                        tasksSpy.firstCall.returnValue.should.be.an.Array().with.lengthOf(5);

                        sequenceStub.calledOnce.should.be.true();

                        sequenceStub.firstCall.calledWith(sinon.match.array, {
                            transacting: transaction,
                            context: {
                                internal: true
                            }
                        }, loggerStub).should.be.true();

                        sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(5);
                        sequenceStub.firstCall.args[0][0].should.be.a.Function().with.property('name', 'dropHiddenColumnFromTags');
                        sequenceStub.firstCall.args[0][1].should.be.a.Function().with.property('name', 'addVisibilityColumnToKeyTables');
                        sequenceStub.firstCall.args[0][2].should.be.a.Function().with.property('name', 'addMobiledocColumnToPosts');
                        sequenceStub.firstCall.args[0][3].should.be.a.Function().with.property('name', 'addSocialMediaColumnsToUsers');
                        sequenceStub.firstCall.args[0][4].should.be.a.Function().with.property('name', 'addSubscribersTable');

                        // Reset sequence
                        sequenceReset();
                        done();
                    }).catch(done);
                });

                describe('Tasks:', function () {
                    var dropColumnStub, addColumnStub, createTableStub,
                        knexStub, knexMock;

                    beforeEach(function () {
                        knexMock = sandbox.stub().returns({});
                        knexMock.schema = {
                            hasTable: sandbox.stub(),
                            hasColumn: sandbox.stub()
                        };
                        // this MUST use sinon, not sandbox, see sinonjs/sinon#781
                        knexStub = sinon.stub(db, 'knex', {
                            get: function () {
                                return knexMock;
                            }
                        });

                        dropColumnStub = sandbox.stub(schema.commands, 'dropColumn');
                        addColumnStub = sandbox.stub(schema.commands, 'addColumn');
                        createTableStub = sandbox.stub(schema.commands, 'createTable');
                    });

                    afterEach(function () {
                        knexStub.restore();
                    });

                    it('should have tasks for 005', function () {
                        should.exist(updates005);
                        updates005.should.be.an.Array().with.lengthOf(5);
                    });

                    describe('01-drop-hidden-column-from-tags', function () {
                        var dropHiddenColumn = updates005[0];

                        it('does not try to drop column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('tags').returns(Promise.resolve(false));

                            // Execute
                            dropHiddenColumn({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.calledWith('tags').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to drop column if the column does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('tags').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('tags', 'hidden').returns(Promise.resolve(false));

                            // Execute
                            dropHiddenColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('tags').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('tags', 'hidden').should.be.true();

                                dropColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add drop column if table and column are both present', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('tags').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('tags', 'hidden').returns(Promise.resolve(true));

                            // Execute
                            dropHiddenColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('tags').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('tags', 'hidden').should.be.true();

                                dropColumnStub.calledOnce.should.be.true();
                                dropColumnStub.calledWith('tags', 'hidden').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('02-add-visibility-column-to-key-tables', function () {
                        var addVisibilityColumn = updates005[1];

                        it('does not try to add new column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(false));
                            knexMock.schema.hasTable.withArgs('tags').returns(Promise.resolve(false));
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(false));

                            // Execute
                            addVisibilityColumn({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.firstCall.calledWith('posts').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to add new columns if the columns already exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(true));
                            knexMock.schema.hasTable.withArgs('tags').returns(Promise.resolve(true));
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(true));

                            knexMock.schema.hasColumn.withArgs('posts', 'visibility').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('tags', 'visibility').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'visibility').returns(Promise.resolve(true));

                            // Execute
                            addVisibilityColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledThrice.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts').should.be.true();
                                knexMock.schema.hasTable.calledWith('tags').should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledThrice.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts', 'visibility').should.be.true();
                                knexMock.schema.hasColumn.calledWith('tags', 'visibility').should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'visibility').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledThrice.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add new columns if table is present but columns are not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(true));
                            knexMock.schema.hasTable.withArgs('tags').returns(Promise.resolve(true));
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(true));

                            knexMock.schema.hasColumn.withArgs('posts', 'visibility').returns(Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('tags', 'visibility').returns(Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('users', 'visibility').returns(Promise.resolve(false));

                            // Execute
                            addVisibilityColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledThrice.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts').should.be.true();
                                knexMock.schema.hasTable.calledWith('tags').should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledThrice.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts', 'visibility').should.be.true();
                                knexMock.schema.hasColumn.calledWith('tags', 'visibility').should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'visibility').should.be.true();

                                addColumnStub.calledThrice.should.be.true();
                                addColumnStub.calledWith('posts', 'visibility').should.be.true();
                                addColumnStub.calledWith('tags', 'visibility').should.be.true();
                                addColumnStub.calledWith('users', 'visibility').should.be.true();

                                loggerStub.info.calledThrice.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });

                        it('will only try to add columns that do not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(true));
                            knexMock.schema.hasTable.withArgs('tags').returns(Promise.resolve(true));
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(true));

                            knexMock.schema.hasColumn.withArgs('posts', 'visibility').returns(Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('tags', 'visibility').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'visibility').returns(Promise.resolve(false));
                            // Execute
                            addVisibilityColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledThrice.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts').should.be.true();
                                knexMock.schema.hasTable.calledWith('tags').should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledThrice.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts', 'visibility').should.be.true();
                                knexMock.schema.hasColumn.calledWith('tags', 'visibility').should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'visibility').should.be.true();

                                addColumnStub.calledTwice.should.be.true();
                                addColumnStub.calledWith('posts', 'visibility').should.be.true();
                                addColumnStub.calledWith('tags', 'visibility').should.be.false();
                                addColumnStub.calledWith('users', 'visibility').should.be.true();

                                loggerStub.info.calledTwice.should.be.true();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('03-add-mobiledoc-column-to-posts', function () {
                        var addMobiledocColumn = updates005[2];

                        it('does not try to add a new column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(false));

                            // Execute
                            addMobiledocColumn({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.firstCall.calledWith('posts').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to add a new column if the column already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts', 'mobiledoc').returns(Promise.resolve(true));

                            // Execute
                            addMobiledocColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts', 'mobiledoc').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new column if table is present but column is not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts', 'mobiledoc').returns(Promise.resolve(false));

                            // Execute
                            addMobiledocColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts', 'mobiledoc').should.be.true();

                                addColumnStub.calledOnce.should.be.true();
                                addColumnStub.calledWith('posts', 'mobiledoc').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('04-add-social-media-columns-to-users', function () {
                        var addSocialMediaColumns = updates005[3];

                        it('does not try to add new columns if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(false));

                            // Execute
                            addSocialMediaColumns({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.firstCall.calledWith('users').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to add new columns if the columns already exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'facebook').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'twitter').returns(Promise.resolve(true));

                            // Execute
                            addSocialMediaColumns({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledTwice.should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'facebook').should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'twitter').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledTwice.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add new columns if table is present but columns are not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'facebook').returns(Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('users', 'twitter').returns(Promise.resolve(false));

                            // Execute
                            addSocialMediaColumns({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledTwice.should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'facebook').should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'twitter').should.be.true();

                                addColumnStub.calledTwice.should.be.true();
                                addColumnStub.calledWith('users', 'facebook').should.be.true();
                                addColumnStub.calledWith('users', 'twitter').should.be.true();

                                loggerStub.info.calledTwice.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });

                        it('will only try to add columns that do not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('users').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('users', 'facebook').returns(Promise.resolve(false));
                            knexMock.schema.hasColumn.withArgs('users', 'twitter').returns(Promise.resolve(true));

                            // Execute
                            addSocialMediaColumns({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('users').should.be.true();

                                knexMock.schema.hasColumn.calledTwice.should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'facebook').should.be.true();
                                knexMock.schema.hasColumn.calledWith('users', 'twitter').should.be.true();

                                addColumnStub.callCount.should.eql(1);
                                addColumnStub.calledWith('users', 'facebook').should.be.true();
                                addColumnStub.calledWith('users', 'twitter').should.be.false();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });
                    });

                    describe('05-add-subscribers-table', function () {
                        var addSubscribers = updates005[4];

                        it('does not try to add a new table if the table already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('subscribers').returns(new Promise.resolve(true));

                            // Execute
                            addSubscribers({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('subscribers').should.be.true();

                                createTableStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new table if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('subscribers').returns(new Promise.resolve(false));

                            // Execute
                            addSubscribers({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('subscribers').should.be.true();

                                createTableStub.calledOnce.should.be.true();
                                createTableStub.calledWith('subscribers').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });
                });
            });
            describe('Update to 008', function () {
                it('should call all the 008 database upgrade tasks', function (done) {
                    // Setup
                    // Create a new stub, this will replace sequence, so that db calls don't actually get run
                    var sequenceStub = sandbox.stub(),
                        sequenceReset = update.__set__('sequence', sequenceStub);

                    sequenceStub.returns(Promise.resolve([]));

                    // Execute
                    update.execute({fromVersion: '007', toVersion: '008'}).then(function () {
                        versionsSpy.calledOnce.should.be.true();
                        versionsSpy.calledWith('007', '008').should.be.true();
                        versionsSpy.returned(['007', '008']).should.be.true();

                        tasksSpy.calledOnce.should.be.true();
                        tasksSpy.calledWith('008', loggerStub).should.be.true();
                        tasksSpy.firstCall.returnValue.should.be.an.Array().with.lengthOf(1);

                        sequenceStub.calledOnce.should.be.true();

                        sequenceStub.firstCall.calledWith(sinon.match.array, {
                            transacting: transaction,
                            context: {
                                internal: true
                            }
                        }, loggerStub).should.be.true();

                        sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(1);
                        sequenceStub.firstCall.args[0][0].should.be.a.Function().with.property('name', 'addAmpColumnToPosts');

                        // Reset sequence
                        sequenceReset();
                        done();
                    }).catch(done);
                });

                describe('Tasks:', function () {
                    var dropColumnStub, addColumnStub, createTableStub,
                        knexStub, knexMock;

                    beforeEach(function () {
                        knexMock = sandbox.stub().returns({});
                        knexMock.schema = {
                            hasTable: sandbox.stub(),
                            hasColumn: sandbox.stub()
                        };
                        // this MUST use sinon, not sandbox, see sinonjs/sinon#781
                        knexStub = sinon.stub(db, 'knex', {
                            get: function () {
                                return knexMock;
                            }
                        });

                        dropColumnStub = sandbox.stub(schema.commands, 'dropColumn');
                        addColumnStub = sandbox.stub(schema.commands, 'addColumn');
                        createTableStub = sandbox.stub(schema.commands, 'createTable');
                    });

                    afterEach(function () {
                        knexStub.restore();
                    });

                    it('should have tasks for 008', function () {
                        should.exist(updates008);
                        updates008.should.be.an.Array().with.lengthOf(1);
                    });

                    describe('01-add-amp-column-to-posts', function () {
                        var addAmpColumn = updates008[0];

                        it('does not try to add a new column if the table does not exist', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(false));

                            // Execute
                            addAmpColumn({transacting: knexMock}, loggerStub)
                                .then(function () {
                                    done(new Error('expected table not found error'));
                                })
                                .catch(function (err) {
                                    should.exist(err);
                                    err.message.should.eql('Table does not exist!');
                                    knexMock.schema.hasTable.calledOnce.should.be.true();
                                    knexMock.schema.hasTable.firstCall.calledWith('posts').should.be.true();

                                    knexMock.schema.hasColumn.called.should.be.false();

                                    addColumnStub.called.should.be.false();

                                    loggerStub.info.called.should.be.false();
                                    loggerStub.warn.calledOnce.should.be.false();
                                    done();
                                });
                        });

                        it('does not try to add a new column if the column already exists', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(new Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts', 'amp').returns(Promise.resolve(true));

                            // Execute
                            addAmpColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts', 'amp').should.be.true();

                                addColumnStub.called.should.be.false();

                                loggerStub.info.called.should.be.false();
                                loggerStub.warn.calledOnce.should.be.true();

                                done();
                            }).catch(done);
                        });

                        it('tries to add a new column if table is present but column is not', function (done) {
                            // Setup
                            knexMock.schema.hasTable.withArgs('posts').returns(Promise.resolve(true));
                            knexMock.schema.hasColumn.withArgs('posts', 'amp').returns(Promise.resolve(false));

                            // Execute
                            addAmpColumn({transacting: knexMock}, loggerStub).then(function () {
                                knexMock.schema.hasTable.calledOnce.should.be.true();
                                knexMock.schema.hasTable.calledWith('posts').should.be.true();

                                knexMock.schema.hasColumn.calledOnce.should.be.true();
                                knexMock.schema.hasColumn.calledWith('posts', 'amp').should.be.true();

                                addColumnStub.calledOnce.should.be.true();
                                addColumnStub.calledWith('posts', 'amp').should.be.true();

                                loggerStub.info.calledOnce.should.be.true();
                                loggerStub.warn.called.should.be.false();

                                done();
                            }).catch(done);
                        });
                    });
                });
            });
        });

        describe('Update Database Schema', function () {
            var updateDatabaseSchema = update.__get__('updateDatabaseSchema');

            it('should not do anything if there are no tasks', function (done) {
                updateDatabaseSchema([], loggerStub).then(function () {
                    loggerStub.info.called.should.be.true();
                    loggerStub.warn.called.should.be.false();
                    done();
                }).catch(done);
            });

            it('should call the tasks if they are provided', function (done) {
                var task1Stub = sandbox.stub().returns(new Promise.resolve()),
                    task2Stub = sandbox.stub().returns(new Promise.resolve());

                updateDatabaseSchema([task1Stub, task2Stub], loggerStub).then(function () {
                    task1Stub.calledOnce.should.be.true();
                    task2Stub.calledOnce.should.be.true();
                    sinon.assert.callOrder(task1Stub, task2Stub);

                    done();
                }).catch(done);
            });
        });
    });
});
