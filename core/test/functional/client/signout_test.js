// # Signout Test
// Test that signout works correctly

/*globals casper, __utils__, url, testPost, falseUser, email */
CasperTest.emberBegin("Ghost signout works correctly", 4, function suite(test) {
    CasperTest.Routines.register.run(test);
    CasperTest.Routines.logout.run(test);
    CasperTest.Routines.login.run(test);

    casper.thenOpenAndWaitForPageLoad('root', function then() {
        test.assertTitle("Ghost Admin", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/ember\/\d+\/$/, 'Landed on the correct URL without signing in');
    });

    casper.thenClick('#usermenu a').waitFor(function checkOpaque() {
        return this.evaluate(function () {
            var menu = document.querySelector('#usermenu .overlay.open');
            return window.getComputedStyle(menu).getPropertyValue('display') === "block"
                && window.getComputedStyle(menu).getPropertyValue('opacity') === "1";
        });
    });

    casper.captureScreenshot('user-menu-open.png');

    casper.waitForSelector('.usermenu-signout a');
    casper.thenClick('.usermenu-signout a');

    casper.waitForSelector('#login').then(function assertSuccess() {
        test.assert(true, 'Got login screen');
    });

    casper.captureScreenshot('user-menu-logout-clicked.png');

    casper.waitForSelector('.notification-success', function onSuccess() {
        test.assert(true, 'Got success notification');
    }, function onTimeout() {
        test.assert(false, 'No success notification :(');
    });
}, true);