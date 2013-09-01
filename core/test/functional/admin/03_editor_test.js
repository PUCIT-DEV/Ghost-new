/*globals casper, __utils__, url, testPost */

casper.test.begin("Ghost editor is correct", 10, function suite(test) {
    test.filename = "editor_test.png";

    casper.start(url + "ghost/editor", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
        test.assertUrlMatch(/ghost\/editor$/, "Ghost doesn't require login this time");
        test.assertExists(".entry-markdown", "Ghost editor is present");
        test.assertExists(".entry-preview", "Ghost preview is present");
    }).viewport(1280, 1024);

    function handleResource(resource) {
        if (resource.url === url + 'api/v0.1/posts') {
            casper.removeListener('resource.received', handleResource);
            casper.test.assertEquals(resource.status, 200, "Received correct response");
        }
    }

    // test saving with no data
    casper.thenClick('.button-save');

    casper.waitForSelector('.notification-error', function onSuccess() {
        test.assert(true, 'Save without title results in error notification as expected');
        test.assertSelectorDoesntHaveText('.notification-error', '[object Object]');
    }, function onTimeout() {
        test.assert(false, 'Save without title did not result in an error notification');
    });

    casper.then(function createTestPost() {
        casper.sendKeys('#entry-title', testPost.title);
        casper.writeContentToCodeMirror(testPost.content);
    });

    // We must wait after sending keys to CodeMirror
    casper.wait(1000, function doneWait() {
        this.echo("I've waited for 1 seconds.");
        // bind to resource events so we can get the API response
        casper.on('resource.received', handleResource);
    });

    casper.thenClick('.button-save');

    casper.waitForResource(/posts/, function checkPostWasCreated() {
        var urlRegExp = new RegExp("^" + url + "ghost\/editor\/[0-9]*");
        test.assertUrlMatch(urlRegExp, 'got an id on our URL');
        test.assertExists('.notification-success', 'got success notification');
        test.assertEvalEquals(function () {
            return document.querySelector('#entry-title').value;
        }, testPost.title, 'Title is correct');

        // TODO: make this work - spaces & newlines are problematic
        // test.assertTextExists(testPost.content, 'Post content exists');
    });

    casper.run(function () {
        casper.removeListener('resource.received', handleResource);
        test.done();
    });
});


casper.test.begin("Haunted markdown in editor works", 3, function suite(test) {
    test.filename = "markdown_test.png";

    casper.start(url + "ghost/editor", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
    }).viewport(1280, 1024);

    casper.then(function testImage() {
        casper.writeContentToCodeMirror("![sometext]()");
    });

    // We must wait after sending keys to CodeMirror
    casper.wait(1000, function doneWait() {
        this.echo("I've waited for 1 seconds.");
        // bind to resource events so we can get the API response
    });

    casper.then(function checkPostWasCreated() {

        test.assertEvalEquals(function () {
            return document.querySelector('.CodeMirror-wrap textarea').value;
        }, "![sometext]()", 'Editor value is correct');

        test.assertSelectorHasText('.entry-preview .rendered-markdown', 'Add image of sometext', 'Editor value is correct');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin("Word count and plurality", 4, function suite(test) {
    test.filename = "editor_plurality_test.png";

    casper.start(url + "ghost/editor", function testTitleAndUrl() {
        test.assertTitle("", "Ghost admin has no title");
    }).viewport(1280, 1024);

    casper.then(function checkZeroPlural() {
        test.assertSelectorHasText('.entry-word-count', '0 words', 'count of 0 produces plural "words".');
    });

    casper.then(function () {
        casper.writeContentToCodeMirror('test');
    });

    // We must wait after sending keys to CodeMirror
    casper.wait(1000, function doneWait() {
        this.echo('I\'ve waited for 1 seconds.');
    });

    casper.then(function checkSinglular() {
        test.assertSelectorHasText('.entry-word-count', '1 word', 'count of 1 produces singular "word".');
    });

    casper.then(function () {
        casper.writeContentToCodeMirror('test'); // append another word, assumes newline
    });

    // We must wait after sending keys to CodeMirror
    casper.wait(1000, function doneWait() {
        this.echo('I\'ve waited for 1 seconds.');
    });

    casper.then(function checkPlural() {
        test.assertSelectorHasText('.entry-word-count', '2 words', 'count of 2 produces plural "words".');
    });

    casper.run(function () {
        test.done();
    });
});

casper.test.begin('Title Trimming', function suite(test) {
    var untrimmedTitle = '  test title  ',
        trimmedTitle = 'test title';

    test.filename = 'editor_title_trimming_test.png';

    casper.start(url + 'ghost/editor/', function testTitleAndUrl() {
        test.assertTitle('', 'Ghost admin has no title');
    }).viewport(1280, 1024);

    casper.then(function populateTitle() {
        casper.sendKeys('#entry-title', untrimmedTitle);

        test.assertEvalEquals(function () {

            return $('#entry-title').val();
            
        }, trimmedTitle, 'Entry title should match expected value.');
    });

    casper.run(function () {
        test.done();
    });
});