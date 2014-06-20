// # Signin Test
// Test that signin works, including testing our spam prevention mechanisms

/*globals casper, __utils__, url, newUser, user, falseUser */

//CasperTest.emberBegin('Ensure Session is Killed', 1, function suite(test) {
//    casper.thenOpenAndWaitForPageLoad('signout', function ensureSignedOut() {
//        test.assertUrlMatch(/ghost\/ember\/sign/, 'We got redirected to signin or signup page');
//    });
//}, true);

CasperTest.emberBegin('Ensure a User is Registered', 3, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('signup', function checkUrl() {
        test.assertUrlMatch(/ghost\/ember\/signup\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque(".signup-box",
        function then() {
            this.fillAndSave("#signup", newUser);
        },
        function onTimeout() {
            test.fail('Sign up form didn\'t fade in.');
        });

    casper.captureScreenshot('login_register_test.png');

    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
        test.assertSelectorHasText('.notification-error', 'already registered');
        // If the previous assert succeeds, then we should skip the next check and just pass.
        casper.echoConcise('Already registered!');
        casper.captureScreenshot('already_registered.png');
    }, function onTimeout() {
        test.assertUrlMatch(/ghost\/ember\/\d+\/$/, 'If we\'re not already registered, we should be logged in.');
        casper.echoConcise('Successfully registered.');
    }, 2000);

    casper.thenOpenAndWaitForPageLoad('signout', function then() {
        test.assertUrlMatch(/ghost\/ember\/signin/, 'We got redirected to signin page.');
    });
}, true);

CasperTest.emberBegin("Ghost admin will load login page", 3, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/ember\/signin\/$/, 'We should be presented with the signin page.');

        casper.then(function testLink() {
            var link = this.evaluate(function (selector) {
                return document.querySelector(selector).getAttribute('href');
            }, '.forgotten-password');

            casper.echoConcise('LINK' + link);
            test.assert(link === '/ghost/ember/forgotten/', 'Has correct forgotten password link');
        });
    });
}, true);

// Note, this test applies to a global redirect, which sends us to the standard admin.
// Once Ember becomes the standard admin, this test should still pass.
CasperTest.emberBegin('Redirects login to signin', 2, function suite(test) {
    casper.start(url + 'ghost/login/', function testRedirect(response) {
        test.assertEqual(response.status, 200, 'Response status should be 200.');
        test.assertUrlMatch(/ghost\/signin\//, 'Should be redirected to /signin/.');
    });
}, true);

CasperTest.emberBegin("Can't spam it", 4, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('signin', function testTitle() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/ember\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque(".login-box",
        function then() {
            this.fillAndSave("#login", falseUser);
        },
        function onTimeout() {
            test.fail('Sign in form didn\'t fade in.');
        });


    casper.captureScreenshot('login_spam_test.png');

    casper.wait(200, function doneWait() {
        this.fillAndSave("#login", falseUser);
    });

    casper.captureScreenshot('login_spam_test2.png');

    casper.waitForText('Slow down, there are way too many login attempts!', function onSuccess() {
        test.assert(true, 'Spamming the login did result in an error notification');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'Spamming the login did not result in an error notification');
    });

    // This test causes the spam notification
    // add a wait to ensure future tests don't get tripped up by this.
    casper.wait(2000);
}, true);


CasperTest.emberBegin("Login limit is in place", 4, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/ember\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque(".login-box",
        function then() {
            this.fillAndSave("#login", falseUser);
        },
        function onTimeout() {
            test.fail('Sign in form didn\'t fade in.');
        });

    casper.wait(2100, function doneWait() {
        this.fillAndSave("#login", falseUser);
    });

    casper.waitForText('remaining', function onSuccess() {
        test.assert(true, 'The login limit is in place.');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'We did not trip the login limit.');
    });
    // This test used login, add a wait to
    // ensure future tests don't get tripped up by this.
    casper.wait(2000);
}, true);

CasperTest.emberBegin("Can login to Ghost", 5, function suite(test) {
    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/ember\/signin\/$/, 'Landed on the correct URL');
    });

    casper.waitForOpaque(".login-box", function then() {
        this.fillAndSave("#login", user);
    });

    casper.wait(2000);

    casper.waitForResource(/posts/, function testForDashboard() {
        test.assertUrlMatch(/ghost\/ember\/\d+\/$/, 'Landed on the correct URL');
        test.assertExists("#global-header", "Global admin header is present");
        test.assertExists(".manage", "We're now on content");
    }, function onTimeOut() {
        test.fail('Failed to signin');
    });
}, true);

// Uncomment when signin / email validation has been readded to the frontend
//CasperTest.emberBegin('Ensure email field form validation', 3, function suite(test) {
//    casper.thenOpenAndWaitForPageLoad('signin', function testTitleAndUrl() {
//        test.assertTitle("Ghost Admin", "Ghost admin has no title");
//        test.assertUrlMatch(/ghost\/ember\/signin\/$/, 'Landed on the correct URL');
//    });
//
//    casper.waitForOpaque(".js-login-box",
//        function then() {
//            this.fillAndSave("form.login-form", {
//                'email': 'notanemail'
//            });
//        },
//        function onTimeout() {
//            test.fail('Login form didn\'t fade in.');
//        });
//
//    casper.waitForSelectorTextChange('.notification-error', function onSuccess() {
//        test.assertSelectorHasText('.notification-error', 'Invalid Email');
//    }, function onTimeout() {
//        test.fail('Email validation error did not appear');
//    }, 2000);
//
//}, true);
