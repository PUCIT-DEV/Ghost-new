/*global window, document, Ghost, $, _, Backbone, Countable */
(function () {
    "use strict";

    var Settings = {};

    // Base view
    // ----------
    Ghost.Views.Settings = Ghost.View.extend({
        initialize: function (options) {
            $(".settings-content").removeClass('active');

            this.sidebar = new Settings.Sidebar({
                el: '.settings-sidebar',
                pane: options.pane,
                model: this.model
            });

            this.addSubview(this.sidebar);

            this.listenTo(Ghost.router, "route:settings", this.changePane);
        },

        changePane: function (pane) {
            if (!pane) {
                // Can happen when trying to load /settings with no pane specified
                // let the router navigate itself to /settings/general
                return;
            }

            this.sidebar.showContent(pane);
        }
    });

    // Sidebar (tabs)
    // ---------------
    Settings.Sidebar = Ghost.View.extend({
        initialize: function (options) {
            this.render();
            this.menu = this.$('.settings-menu');
            this.showContent(options.pane);
        },

        models: {},

        events: {
            'click .settings-menu li' : 'switchPane'
        },

        switchPane: function (e) {
            e.preventDefault();
            var item = $(e.currentTarget),
                id = item.find('a').attr('href').substring(1);

            this.showContent(id);
        },

        showContent: function (id) {
            var self = this,
                model,
                themes;

            Ghost.router.navigate('/settings/' + id);
            Ghost.trigger('urlchange');
            if (this.pane && id === this.pane.el.id) {
                return;
            }
            _.result(this.pane, 'destroy');
            this.setActive(id);
            this.pane = new Settings[id]({ el: '.settings-content'});

            if (!this.models.hasOwnProperty(this.pane.options.modelType)) {
                themes = this.models.Themes = new Ghost.Models.Themes();
                model = this.models[this.pane.options.modelType] = new Ghost.Models[this.pane.options.modelType]();
                themes.fetch().then(function () {
                    model.fetch().then(function () {
                        model.set({availableThemes: themes.toJSON()});
                        self.renderPane(model);
                    });
                });
            } else {
                model = this.models[this.pane.options.modelType];
                self.renderPane(model);
            }
        },

        renderPane: function (model) {
            this.pane.model = model;
            this.pane.render();
        },

        setActive: function (id) {
            this.menu.find('li').removeClass('active');
            this.menu.find('a[href=#' + id + ']').parent().addClass('active');
        },

        templateName: 'settings/sidebar'
    });

    // Content panes
    // --------------
    Settings.Pane = Ghost.View.extend({
        options: {
            modelType: 'Settings'
        },
        destroy: function () {
            this.$el.removeClass('active');
            this.undelegateEvents();
        },
        render: function () {
            this.$el.hide();
            Ghost.View.prototype.render.call(this);
            this.$el.fadeIn(300);
        },
        afterRender: function () {
            this.$el.attr('id', this.id);
            this.$el.addClass('active');

            this.$('input').iCheck({
                checkboxClass: 'icheckbox_ghost'
            });
        },
        saveSuccess: function (model, response, options) {
            // TODO: better messaging here?
            Ghost.notifications.addItem({
                type: 'success',
                message: 'Saved',
                status: 'passive'
            });
        },
        saveError: function (model, xhr) {
            Ghost.notifications.addItem({
                type: 'error',
                message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                status: 'passive'
            });
        },
        validationError: function (message) {
            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        }
    });

    // TODO: use some kind of data-binding for forms

    // ### General settings
    Settings.general = Settings.Pane.extend({
        id: "general",

        events: {
            'click .button-save': 'saveSettings',
            'click .js-modal-logo': 'showLogo',
            'click .js-modal-cover': 'showCover'
        },

        saveSettings: function () {
            var themes = this.model.get('availableThemes'),
                title = this.$('#blog-title').val(),
                description = this.$('#blog-description').val(),
                email = this.$('#email-address').val(),
                postsPerPage = this.$('#postsPerPage').val();

            Ghost.Validate._errors = [];
            Ghost.Validate
                .check(title, {message: "Title is too long", el: $('#blog-title')})
                .len(0, 150);
            Ghost.Validate
                .check(description, {message: "Description is too long", el: $('#blog-description')})
                .len(0, 200);
            Ghost.Validate
                .check(email, {message: "Please supply a valid email address", el: $('#email-address')})
                .isEmail().len(0, 254);
            Ghost.Validate
                .check(postsPerPage, {message: "Please use a number", el: $('postsPerPage')})
                .isInt();

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {

                this.model.unset('availableThemes');
                this.model.save({
                    title: title,
                    description: description,
                    logo: this.$('#blog-logo').attr("src"),
                    cover: this.$('#blog-cover').attr("src"),
                    email: email,
                    postsPerPage: postsPerPage,
                    activeTheme: this.$('#activeTheme').val()
                }, {
                    success: this.saveSuccess,
                    error: this.saveError
                });
                this.model.set({availableThemes: themes});
            }
        },
        showLogo: function () {
            var settings = this.model.toJSON();
            this.showUpload('#logo', 'logo', settings.logo);
        },
        showCover: function () {
            var settings = this.model.toJSON();
            this.showUpload('#cover', 'cover', settings.icon);
        },
        showUpload: function (id, key, src) {
            var self = this, upload = new Ghost.Models.uploadModal({'id': id, 'key': key, 'src': src, 'accept': {
                func: function () { // The function called on acceptance
                    var data = {},
                        themes;
                    data[key] = this.$('.js-upload-target').attr('src');
                    themes = self.model.get('availableThemes');
                    self.model.unset('availableThemes');
                    self.model.save(data, {
                        success: self.saveSuccess,
                        error: self.saveError
                    });
                    self.model.set({availableThemes: themes});
                    self.render();
                    return true;
                },
                buttonClass: "button-save right",
                text: "Save" // The accept button text
            }});

            this.addSubview(new Ghost.Views.Modal({
                model: upload
            }));
        },
        templateName: 'settings/general',

        afterRender: function () {
            this.$('.js-drop-zone').upload();
            Settings.Pane.prototype.afterRender.call(this);
        }
    });

    // ### User profile
    Settings.user = Settings.Pane.extend({
        id: 'user',

        options: {
            modelType: 'User'
        },

        events: {
            'click .button-save': 'saveUser',
            'click .button-change-password': 'changePassword',
            'click .js-modal-cover-picture': 'showCoverPicture',
            'click .js-modal-profile-picture': 'showProfilePicture'
        },
        showCoverPicture: function () {
            var user = this.model.toJSON();
            this.showUpload('#user-cover-picture', 'cover_picture', user.cover_picture);
        },
        showProfilePicture: function (e) {
            e.preventDefault();
            var user = this.model.toJSON();
            this.showUpload('#user-profile-picture', 'profile_picture', user.profile_picture);
        },
        showUpload: function (id, key, src) {
            var self = this, upload = new Ghost.Models.uploadModal({'id': id, 'key': key, 'src': src, 'accept': {
                func: function () { // The function called on acceptance
                    var data = {};
                    data[key] = this.$('.js-upload-target').attr('src');
                    self.model.save(data, {
                        success: self.saveSuccess,
                        error: self.saveError
                    });
                    self.render();
                    return true;
                },
                buttonClass: "button-save right",
                text: "Save" // The accept button text
            }});

            this.addSubview(new Ghost.Views.Modal({
                model: upload
            }));
        },


        saveUser: function () {
            var userName = this.$('#user-name').val(),
                userEmail = this.$('#user-email').val(),
                userLocation = this.$('#user-location').val(),
                userWebsite = this.$('#user-website').val(),
                userBio = this.$('#user-bio').val();

            Ghost.Validate._errors = [];
            Ghost.Validate
                .check(userName, {message: "Name is too long", el: $('#user-name')})
                .len(0, 150);
            Ghost.Validate
                .check(userBio, {message: "Bio is too long", el: $('#user-bio')})
                .len(0, 200);
            Ghost.Validate
                .check(userEmail, {message: "Please supply a valid email address", el: $('#user-email')})
                .isEmail();
            Ghost.Validate
                .check(userLocation, {message: "Location is too long", el: $('#user-location')})
                .len(0, 150);
            if (userWebsite.length > 0) {
                Ghost.Validate
                    .check(userWebsite, {message: "Please use a valid url", el: $('#user-website')})
                    .isUrl()
                    .len(0, 2000);
            }

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {

                this.model.save({
                    'full_name':        userName,
                    'email_address':    userEmail,
                    'location':         userLocation,
                    'url':              userWebsite,
                    'bio':              userBio,
                    'profile_picture':  this.$('#user-profile-picture').attr('src'),
                    'cover_picture':    this.$('#user-cover-picture').attr('src')
                }, {
                    success: this.saveSuccess,
                    error: this.saveError
                });
            }
        },

        changePassword: function (event) {
            event.preventDefault();
            var self = this,
                oldPassword = this.$('#user-password-old').val(),
                newPassword = this.$('#user-password-new').val(),
                ne2Password = this.$('#user-new-password-verification').val();

            Ghost.Validate._errors = [];
            Ghost.Validate.check(newPassword, {message: 'Your new passwords do not match'}).equals(ne2Password);
            Ghost.Validate.check(newPassword, {message: 'Your password is not long enough. It must be at least 8 chars long.'}).len(8);

            if (Ghost.Validate._errors.length > 0) {
                Ghost.Validate.handleErrors();
            } else {

                $.ajax({
                    url: '/ghost/changepw/',
                    type: 'POST',
                    data: {
                        password: oldPassword,
                        newpassword: newPassword,
                        ne2password: ne2Password
                    },
                    success: function (msg) {
                        Ghost.notifications.addItem({
                            type: 'success',
                            message: msg.msg,
                            status: 'passive',
                            id: 'success-98'
                        });
                        self.$('#user-password-old, #user-password-new, #user-new-password-verification').val('');
                    },
                    error: function (xhr) {
                        Ghost.notifications.addItem({
                            type: 'error',
                            message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                            status: 'passive'
                        });
                    }
                });
            }
        },

        templateName: 'settings/user-profile',

        afterRender: function () {
            var self = this;
            Countable.live(document.getElementById('user-bio'), function (counter) {
                if (counter.all > 180) {
                    self.$('.bio-container .word-count').css({color: "#e25440"});
                } else {
                    self.$('.bio-container .word-count').css({color: "#9E9D95"});
                }

                self.$('.bio-container .word-count').text(200 - counter.all);

            });

            Settings.Pane.prototype.afterRender.call(this);
        }
    });

    // ### User settings
    Settings.users = Settings.Pane.extend({
        id: 'users',
        events: {
        }
    });

    // ### Appearance settings
    Settings.appearance = Settings.Pane.extend({
        id: 'appearance',
        events: {
        }
    });

    // ### Services settings
    Settings.services = Settings.Pane.extend({
        id: 'services',
        events: {
        }
    });

    // ### Plugins settings
    Settings.plugins = Settings.Pane.extend({
        id: 'plugins',
        events: {
        }
    });

}());
