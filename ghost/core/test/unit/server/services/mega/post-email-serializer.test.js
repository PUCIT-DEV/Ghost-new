const should = require('should');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const urlUtils = require('../../../../../core/shared/url-utils');
const urlService = require('../../../../../core/server/services/url');
const labs = require('../../../../../core/shared/labs');
const {parseReplacements, renderEmailForSegment, serialize, _getTemplateSettings, createUnsubscribeUrl, createPostSignupUrl, _PostEmailSerializer} = require('../../../../../core/server/services/mega/post-email-serializer');

describe('Post Email Serializer', function () {
    it('creates replacement pattern for valid format and value', function () {
        const html = '<html>Hey %%{first_name}%%, what is up?</html>';
        const plaintext = 'Hey %%{first_name}%%, what is up?';

        const replaced = parseReplacements({
            html,
            plaintext
        });

        replaced.length.should.equal(2);
        replaced[0].format.should.equal('html');
        replaced[0].recipientProperty.should.equal('member_first_name');

        replaced[1].format.should.equal('plaintext');
        replaced[1].recipientProperty.should.equal('member_first_name');
    });

    it('does not create replacements for unsupported variable names', function () {
        const html = '<html>Hey %%{last_name}%%, what is up?</html>';
        const plaintext = 'Hey %%{age}%%, what is up?';

        const replaced = parseReplacements({
            html,
            plaintext
        });

        replaced.length.should.equal(0);
    });

    describe('serialize', function () {
        it('should output valid HTML and escape HTML characters in mobiledoc', async function () {
            sinon.stub(_PostEmailSerializer, 'serializePostModel').callsFake(async () => {
                return {
                    // This is not realistic, but just to test escaping
                    url: 'https://testpost.com/t&es<3t-post"</body>/',
                    title: 'This is\' a blog po"st test <3</body>',
                    excerpt: 'This is a blog post test <3</body>',
                    authors: 'This is a blog post test <3</body>',
                    feature_image_alt: 'This is a blog post test <3</body>',
                    feature_image_caption: 'This is a blog post test <3</body>',

                    // This is a markdown post with all cards that contain <3 in all fields + </body> tags
                    // Note that some fields are already escaped in the frontend
                    // eslint-disable-next-line
                    mobiledoc: JSON.stringify({"version":"0.3.1","atoms":[],"cards":[['markdown',{markdown: 'This is a test markdown <3'}],['email',{html: '<p>Hey {first_name, "there"}, &lt;3</p>'}],['button',{alignment: 'center',buttonText: 'Button <3 </body>',buttonUrl: 'I <3 test </body>'}],['embed',{url: 'https://opensea.io/assets/0x495f947276749ce646f68ac8c248420045cb7b5e/85405838485527185183935784047901288096962687962314908211909792283039451054081/',type: 'nft',metadata: {version: '1.0',title: '<3 LOVE PENGUIN #1',author_name: 'Yeex',author_url: 'https://opensea.io/Yeex',provider_name: 'OpenSea',provider_url: 'https://opensea.io',image_url: 'https://lh3.googleusercontent.com/d1N3L-OGHpCptdTHMJxqBJtIfZFAJ-CSv0ZDwsaQTtPqy7NHCt_GVmnQoWt0S8Pfug4EmQr4UdPjrYSjop1KTKJfLt6DWmjnXdLdrQ',creator_name: 'Yeex<3',description: '<3 LOVE PENGUIN #1',collection_name: '<3 LOVE PENGUIN'},caption: 'I &lt;3 NFT captions'}],['callout',{calloutEmoji: '💡',calloutText: 'Callout test &lt;3',backgroundColor: 'grey'}],['toggle',{heading: 'Toggle &lt;3 header',content: '<p>Toggle &lt;3 content</p>'}],['video',{loop: false,src: '__GHOST_URL__/content/media/2022/09/20220"829-<3ghost</body>.mp4',fileName: '20220829 ghos"t.mp4',width: 3072,height: 1920,duration: 221.5,mimeType: 'video/mp4',thumbnailSrc: '__GHOST_URL__/content/images/2022/09/media-th\'umbn"ail-<3</body>.jpg',thumbnailWidth: 3072,thumbnailHeight: 1920,caption: 'Test &lt;3'}],['file',{loop: false,src: '__GHOST_URL__/content/files/2022/09/image<3</body>.png',fileName: 'image<3</body>.png',fileTitle: 'Image 1<3</body>',fileCaption: '<3</body>',fileSize: 152594}],['audio',{loop: false,src: '__GHOST_URL__/content/media/2022/09/sound<3</body>.mp3',title: 'I <3</body> audio files',duration: 27.252,mimeType: 'audio/mpeg'}],['file',{loop: false,src: '__GHOST_URL__/content/files/2022/09/image<3</body>.png',fileName: 'image<3</body>.png',fileTitle: 'I <3</body> file names',fileCaption: 'I <3</body> file descriptions',fileSize: 152594}],['embed',{caption: 'I &lt;3 YouTube videos Lost On You',html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/wDjeBNv6ip0?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="LP - Lost On You (Live)"></iframe>',metadata: {author_name: 'LP',author_url: 'https://www.youtube.com/c/LP',height: 113,provider_name: 'YouTube',provider_url: 'https://www.youtube.com/',thumbnail_height: 360,thumbnail_url: 'https://i.ytimg.com/vi/wDjeBNv6ip0/hqdefault.jpg',thumbnail_width: 480,title: 'LP - Lost On You <3 (Live)',version: '1.0',width: 200},type: 'video',url: 'https://www.youtube.com/watch?v=wDjeBNv6ip0&list=RDwDjeBNv6ip0&start_radio=1'}],['image',{src: '__GHOST_URL__/content/images/2022/09/"<3</body>.png',width: 780,height: 744,caption: 'i &lt;3 images',alt: 'I <3</body> image alts'}],['gallery',{images: [{fileName: 'image<3</body>.png',row: 0,width: 780,height: 744,src: '__GHOST_URL__/content/images/2022/09/<3</body>.png'}],caption: 'I &lt;3 image galleries'}],['hr',{}]],markups: [['a',['href','https://google.com/<3</body>']],['strong'],['em']],sections: [[1,'p',[[0,[],0,'This is a <3</body> post test']]],[10,0],[10,1],[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[10,11],[10,12],[1,'p',[[0,[0],1,'https://google.com/<3</body>']]],[1,'p',[[0,[],0,'Paragraph test <3</body>']]],[1,'p',[[0,[1],1,'Bold paragraph test <3</body>']]],[1,'h3',[[0,[],0,'Heading test <3</body>']]],[1,'blockquote',[[0,[],0,'Quote test <3</body>']]],[1,'p',[[0,[2],1,'Italic test<3</body>']]],[1,'p',[]]],ghostVersion: '4.0'})
                };
            });
            const customSettings = {
                icon: 'icon2<3</body>',
                accent_color: '#000099',
                timezone: 'UTC'
            };

            const settingsMock = sinon.stub(settingsCache, 'get');
            settingsMock.callsFake(function (key, options) {
                if (customSettings[key]) {
                    return customSettings[key];
                }

                return settingsMock.wrappedMethod.call(settingsCache, key, options);
            });
            const template = {
                name: 'My newsletter <3</body>',
                header_image: 'https://testpost.com/test-post</body>/',
                show_header_icon: true,
                show_header_title: true,
                show_feature_image: true,
                title_font_category: 'sans-serif',
                title_alignment: 'center',
                body_font_category: 'serif',
                show_badge: true,
                show_header_name: true,
                // Note: we don't need to check the footer content because this should contain valid HTML (not text)
                footer_content: '<span>Footer content with valid HTML</span>'
            };
            const newsletterMock = {
                get: function (key) {
                    return template[key];
                },
                toJSON: function () {
                    return template;
                }
            };

            const output = await serialize({}, newsletterMock, {isBrowserPreview: false});

            // Test if the email HTML is valid standard HTML5
            const {HtmlValidate} = require('html-validate');

            const htmlvalidate = new HtmlValidate({
                extends: [
                    'html-validate:document',
                    'html-validate:standard'
                ],
                rules: {
                    // We need deprecated attrs for legacy tables in older email clients
                    'no-deprecated-attr': 'off',

                    // Don't care that the first <hx> isn't <h1>
                    'heading-level': 'off'
                },
                elements: [
                    'html5',
                    // By default, html-validate requires the 'lang' attribute on the <html> tag. We don't really want that for now.
                    {
                        html: {
                            attributes: {
                                lang: {
                                    required: false
                                }
                            }
                        }
                    }
                ]
            });
            const report = htmlvalidate.validateString(output.html);

            // Improve debugging and show a snippet of the invalid HTML instead of just the line number or a huge HTML-dump
            const parsedErrors = [];
            
            if (!report.valid) {
                const lines = output.html.split('\n');
                const messages = report.results[0].messages;

                for (const item of messages) {
                    if (item.severity !== 2) {
                        // Ignore warnings
                        continue;
                    }
                    const start = Math.max(item.line - 4, 0);
                    const end = Math.min(item.line + 4, lines.length - 1);

                    const html = lines.slice(start, end).map(l => l.trim()).join('\n');
                    parsedErrors.push(`${item.ruleId}: ${item.message}\n   At line ${item.line}, col ${item.column}\n   HTML-snippet:\n${html}`);
                }
            }

            // Fail if invalid HTML
            should(report.valid).eql(true, 'Expected valid HTML without warnings, got errors:\n' + parsedErrors.join('\n\n'));

            // Check footer content is not escaped
            should(output.html.includes(template.footer_content)).eql(true);

            // Check doesn't contain the non escaped string '<3'
            should(output.html.includes('<3')).eql(false);

            // Check if the template is rendered fully to the end (to make sure we acutally test all these mobiledocs)
            should(output.html.includes('Heading test &lt;3')).eql(true);
        });
    });

    describe('renderEmailForSegment', function () {
        afterEach(function () {
            sinon.restore();
        });

        it('shouldn\'t change an email that has no member segment', function () {
            const email = {
                otherProperty: true,
                html: '<div>test</div>',
                plaintext: 'test'
            };

            let output = renderEmailForSegment(email, 'status:free');

            output.should.have.keys('html', 'plaintext', 'otherProperty');
            output.html.should.eql('<div>test</div>');
            output.plaintext.should.eql('test');
            output.otherProperty.should.eql(true); // Make sure to keep other properties
        });

        it('should hide non matching member segments', function () {
            const email = {
                otherProperty: true,
                html: 'hello<div data-gh-segment="status:free"> free users!</div><div data-gh-segment="status:-free"> paid users!</div>',
                plaintext: 'test'
            };
            Object.freeze(email); // Make sure we don't modify `email`

            let output = renderEmailForSegment(email, 'status:free');

            output.should.have.keys('html', 'plaintext', 'otherProperty');
            output.html.should.eql('hello<div> free users!</div>');
            output.plaintext.should.eql('hello free users!');

            output = renderEmailForSegment(email, 'status:-free');

            output.should.have.keys('html', 'plaintext', 'otherProperty');
            output.html.should.eql('hello<div> paid users!</div>');
            output.plaintext.should.eql('hello paid users!');
        });

        it('should hide all segments when the segment filter is empty', function () {
            const email = {
                otherProperty: true,
                html: 'hello<div data-gh-segment="status:free"> free users!</div><div data-gh-segment="status:-free"> paid users!</div>',
                plaintext: 'test'
            };

            let output = renderEmailForSegment(email, null);
            output.html.should.equal('hello');
            output.plaintext.should.equal('hello');
        });

        it('should show paywall content for free members on paid posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            output.html.should.containEql(`<p>Free content</p>`);
            output.html.should.containEql(`Subscribe to`);
            output.html.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.html.should.not.containEql(`<p>Members content</p>`);

            output.plaintext.should.containEql(`Free content`);
            output.plaintext.should.containEql(`Subscribe to`);
            output.plaintext.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.plaintext.should.not.containEql(`Members content`);
        });

        it('should show full cta for paid members on paid posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
        });

        it('should show paywall content for free members on specific tier posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'tiers'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            output.html.should.containEql(`<p>Free content</p>`);
            output.html.should.containEql(`Subscribe to`);
            output.html.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.html.should.not.containEql(`<p>Members content</p>`);

            output.plaintext.should.containEql(`Free content`);
            output.plaintext.should.containEql(`Subscribe to`);
            output.plaintext.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.plaintext.should.not.containEql(`Members content`);
        });

        it('should show full cta for paid members on specific tier posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
        });

        it('should show full content for free members on free posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'public'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
        });

        it('should show full content for paid members on free posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'public'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
        });

        it('should not crash on missing post for email with paywall', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
        });
    });

    describe('createUnsubscribeUrl', function () {
        before(function () {
            models.init();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('generates unsubscribe url for preview', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl(null);
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?preview=1');
        });

        it('generates unsubscribe url with only member uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd');
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=member-abcd');
        });

        it('generates unsubscribe url with both post and newsletter uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd', {newsletterUuid: 'newsletter-abcd'});
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=member-abcd&newsletter=newsletter-abcd');
        });

        it('generates unsubscribe url with comments', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd', {comments: true});
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=member-abcd&comments=1');
        });
    });

    describe('createPostSignupUrl', function () {
        before(function () {
            models.init();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('generates signup url on post for published post', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            const unsubscribeUrl = createPostSignupUrl({
                status: 'published',
                id: 'abc123'
            });
            unsubscribeUrl.should.eql('https://site.com/blah/#/portal/signup');
        });

        it('generates signup url on homepage for email only post', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/test/404/');
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/test/');
            const unsubscribeUrl = createPostSignupUrl({
                status: 'sent',
                id: 'abc123'
            });
            unsubscribeUrl.should.eql('https://site.com/test/#/portal/signup');
        });
    });

    describe('getTemplateSettings', function () {
        before(function () {
            models.init();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('uses the newsletter settings', async function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key) {
                return {
                    icon: 'icon2',
                    accent_color: '#000099'
                }[key];
            });
            const newsletterMock = {
                get: function (key) {
                    return {
                        header_image: 'image',
                        show_header_icon: true,
                        show_header_title: true,
                        show_feature_image: true,
                        title_font_category: 'sans-serif',
                        title_alignment: 'center',
                        body_font_category: 'serif',
                        show_badge: true,
                        footer_content: 'footer',
                        show_header_name: true
                    }[key];
                }
            };
            const res = await _getTemplateSettings(newsletterMock);
            should(res).eql({
                headerImage: 'image',
                showHeaderIcon: 'icon2',
                showHeaderTitle: true,
                showFeatureImage: true,
                titleFontCategory: 'sans-serif',
                titleAlignment: 'center',
                bodyFontCategory: 'serif',
                showBadge: true,
                footerContent: 'footer',
                accentColor: '#000099',
                adjustedAccentColor: '#000099',
                adjustedAccentContrastColor: '#FFFFFF',
                showHeaderName: true
            });
        });
    });
});
