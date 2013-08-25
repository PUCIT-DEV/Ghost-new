/**
 * Tests the flow of creating, editing and publishing tests
 */

/*globals casper, __utils__, url, testPost */
casper.test.begin("Ghost edit draft flow works correctly", 7, function suite(test) {

    casper.test.filename = "flow_test.png";

    casper.start(url + "ghost/editor", function then() {
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/editor", "Ghost doesn't require login this time");
    }).viewport(1280, 1024);

    // First, create a new draft post
    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', 'Test Draft Post');
        casper.writeContentToCodeMirror('I am a draft');
    });

    // We must wait after sending keys to CodeMirror
    casper.wait(1000, function doneWait() {
        this.echo("I've waited for 1 seconds.");
    });

    casper.thenClick('.button-save').waitForResource(/posts/, function then() {
        test.assertExists('.notification-success', 'got success notification');
    });

    casper.thenOpen(url + 'ghost/content/', function then() {
        test.assertEquals(casper.getCurrentUrl(), url + "ghost/content/", "Ghost doesn't require login this time");
    });

    casper.then(function then() {
        test.assertEvalEquals(function () {
            return document.querySelector('.content-list-content li').className;
        }, "active", "first item is active");

        test.assertSelectorHasText(".content-list-content li:first-child h3", 'Test Draft Post', "first item is the post we created");
    });

    casper.thenClick('.post-edit').waitForResource(/editor/, function then() {
        test.assertUrlMatch(/editor/, "Ghost doesn't require login this time");
    });

    casper.thenClick('.button-save').waitForResource(/posts/, function then() {
        test.assertExists('.notification-success', 'got success notification');
    });

    casper.run(function () {
        test.done();
    });
});

// TODO: test publishing, editing, republishing, unpublishing etc
//casper.test.begin("Ghost edit published flow works correctly", 6, function suite(test) {
//
//    casper.test.filename = "flow_test.png";
//
//
//});