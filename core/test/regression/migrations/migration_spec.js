var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    Models = require('../../../server/models');

describe('Database Migration (special functions)', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    afterEach(function () {
        sinon.restore();
    });

    describe('Fixtures', function () {
        // Custom assertion for detection that a permissions is assigned to the correct roles
        should.Assertion.add('AssignedToRoles', function (roles) {
            var roleNames;
            this.params = {operator: 'to have role'};

            should.exist(this.obj);

            this.obj.should.be.an.Object().with.property(['roles']);
            this.obj.roles.should.be.an.Array();

            // Ensure the roles are in id order
            roleNames = _(this.obj.roles).sortBy('id').map('name').value();
            roleNames.should.eql(roles);
        });

        // Custom assertion to wrap all permissions
        should.Assertion.add('CompletePermissions', function () {
            this.params = {operator: 'to have a complete set of permissions'};
            var permissions = this.obj;

            // DB
            permissions[0].name.should.eql('Export database');
            permissions[0].should.be.AssignedToRoles(['Administrator']);
            permissions[1].name.should.eql('Import database');
            permissions[1].should.be.AssignedToRoles(['Administrator']);
            permissions[2].name.should.eql('Delete all content');
            permissions[2].should.be.AssignedToRoles(['Administrator']);

            // Mail
            permissions[3].name.should.eql('Send mail');
            permissions[3].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Notifications
            permissions[4].name.should.eql('Browse notifications');
            permissions[4].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[5].name.should.eql('Add notifications');
            permissions[5].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[6].name.should.eql('Delete notifications');
            permissions[6].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Posts
            permissions[7].name.should.eql('Browse posts');
            permissions[7].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[8].name.should.eql('Read posts');
            permissions[8].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[9].name.should.eql('Edit posts');
            permissions[9].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[10].name.should.eql('Add posts');
            permissions[10].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[11].name.should.eql('Delete posts');
            permissions[11].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Settings
            permissions[12].name.should.eql('Browse settings');
            permissions[12].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[13].name.should.eql('Read settings');
            permissions[13].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[14].name.should.eql('Edit settings');
            permissions[14].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Slugs
            permissions[15].name.should.eql('Generate slugs');
            permissions[15].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);

            // Tags
            permissions[16].name.should.eql('Browse tags');
            permissions[16].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[17].name.should.eql('Read tags');
            permissions[17].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[18].name.should.eql('Edit tags');
            permissions[18].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[19].name.should.eql('Add tags');
            permissions[19].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions[20].name.should.eql('Delete tags');
            permissions[20].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Themes
            permissions[21].name.should.eql('Browse themes');
            permissions[21].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[22].name.should.eql('Edit themes');
            permissions[22].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[23].name.should.eql('Activate themes');
            permissions[23].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[24].name.should.eql('Upload themes');
            permissions[24].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[25].name.should.eql('Download themes');
            permissions[25].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[26].name.should.eql('Delete themes');
            permissions[26].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Users
            permissions[27].name.should.eql('Browse users');
            permissions[27].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[28].name.should.eql('Read users');
            permissions[28].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[29].name.should.eql('Edit users');
            permissions[29].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[30].name.should.eql('Add users');
            permissions[30].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[31].name.should.eql('Delete users');
            permissions[31].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Roles
            permissions[32].name.should.eql('Assign a role');
            permissions[32].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[33].name.should.eql('Browse roles');
            permissions[33].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);

            // Clients
            permissions[34].name.should.eql('Browse clients');
            permissions[34].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[35].name.should.eql('Read clients');
            permissions[35].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[36].name.should.eql('Edit clients');
            permissions[36].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[37].name.should.eql('Add clients');
            permissions[37].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[38].name.should.eql('Delete clients');
            permissions[38].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);

            // Subscribers
            permissions[39].name.should.eql('Browse subscribers');
            permissions[39].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[40].name.should.eql('Read subscribers');
            permissions[40].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[41].name.should.eql('Edit subscribers');
            permissions[41].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[42].name.should.eql('Add subscribers');
            permissions[42].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[43].name.should.eql('Delete subscribers');
            permissions[43].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Invites
            permissions[44].name.should.eql('Browse invites');
            permissions[44].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[45].name.should.eql('Read invites');
            permissions[45].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[46].name.should.eql('Edit invites');
            permissions[46].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[47].name.should.eql('Add invites');
            permissions[47].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[48].name.should.eql('Delete invites');
            permissions[48].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Redirects
            permissions[49].name.should.eql('Download redirects');
            permissions[49].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[50].name.should.eql('Upload redirects');
            permissions[50].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Webhooks
            permissions[51].name.should.eql('Add webhooks');
            permissions[51].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[52].name.should.eql('Edit webhooks');
            permissions[52].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[53].name.should.eql('Delete webhooks');
            permissions[53].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Integrations
            permissions[54].name.should.eql('Browse integrations');
            permissions[54].should.be.AssignedToRoles(['Administrator']);
            permissions[55].name.should.eql('Read integrations');
            permissions[55].should.be.AssignedToRoles(['Administrator']);
            permissions[56].name.should.eql('Edit integrations');
            permissions[56].should.be.AssignedToRoles(['Administrator']);
            permissions[57].name.should.eql('Add integrations');
            permissions[57].should.be.AssignedToRoles(['Administrator']);
            permissions[58].name.should.eql('Delete integrations');
            permissions[58].should.be.AssignedToRoles(['Administrator']);

            // API Keys
            permissions[59].name.should.eql('Browse API keys');
            permissions[59].should.be.AssignedToRoles(['Administrator']);
            permissions[60].name.should.eql('Read API keys');
            permissions[60].should.be.AssignedToRoles(['Administrator']);
            permissions[61].name.should.eql('Edit API keys');
            permissions[61].should.be.AssignedToRoles(['Administrator']);
            permissions[62].name.should.eql('Add API keys');
            permissions[62].should.be.AssignedToRoles(['Administrator']);
            permissions[63].name.should.eql('Delete API keys');
            permissions[63].should.be.AssignedToRoles(['Administrator']);
        });

        describe('Populate', function () {
            beforeEach(testUtils.setup('default'));

            it('should populate all fixtures correctly', function () {
                var props = {
                    posts: Models.Post.findAll({withRelated: ['tags']}),
                    tags: Models.Tag.findAll(),
                    users: Models.User.findAll({
                        filter: 'status:inactive',
                        context: {internal: true},
                        withRelated: ['roles']
                    }),
                    clients: Models.Client.findAll(),
                    roles: Models.Role.findAll(),
                    permissions: Models.Permission.findAll({withRelated: ['roles']})
                };

                return Promise.props(props).then(function (result) {
                    should.exist(result);

                    // Post
                    should.exist(result.posts);
                    result.posts.length.should.eql(7);
                    result.posts.at(0).get('title').should.eql('Welcome to Ghost');
                    result.posts.at(6).get('title').should.eql('Creating a custom theme');

                    // Tag
                    should.exist(result.tags);
                    result.tags.length.should.eql(1);
                    result.tags.at(0).get('name').should.eql('Getting Started');

                    // Post Tag relation
                    result.posts.at(0).related('tags').length.should.eql(1);
                    result.posts.at(0).related('tags').at(0).get('name').should.eql('Getting Started');

                    // Clients
                    should.exist(result.clients);
                    result.clients.length.should.eql(4);
                    result.clients.at(0).get('name').should.eql('Ghost Admin');
                    result.clients.at(1).get('name').should.eql('Ghost Frontend');
                    result.clients.at(2).get('name').should.eql('Ghost Scheduler');
                    result.clients.at(3).get('name').should.eql('Ghost Backup');

                    // User (Owner)
                    should.exist(result.users);
                    result.users.length.should.eql(1);
                    result.users.at(0).get('name').should.eql('Ghost');
                    result.users.at(0).get('status').should.eql('inactive');
                    result.users.at(0).related('roles').length.should.eql(1);
                    result.users.at(0).related('roles').at(0).get('name').should.eql('Owner');

                    // Roles
                    should.exist(result.roles);
                    result.roles.length.should.eql(6);
                    result.roles.at(0).get('name').should.eql('Administrator');
                    result.roles.at(1).get('name').should.eql('Editor');
                    result.roles.at(2).get('name').should.eql('Author');
                    result.roles.at(3).get('name').should.eql('Contributor');
                    result.roles.at(4).get('name').should.eql('Owner');
                    result.roles.at(5).get('name').should.eql('Admin Integration');

                    // Permissions
                    result.permissions.length.should.eql(64);
                    result.permissions.toJSON().should.be.CompletePermissions();
                });
            });
        });
    });
});
