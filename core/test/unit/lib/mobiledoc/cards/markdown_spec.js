const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/markdown');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Markdown card', function () {
    describe('default', function () {
        it('Markdown Card renders', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    markdown: '#HEADING\r\n- list\r\n- items'
                }
            };

            serializer.serialize(card.render(opts)).should.match('<h1 id="heading">HEADING</h1>\n<ul>\n<li>list</li>\n<li>items</li>\n</ul>\n');
        });

        it('Accepts invalid HTML in markdown', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    markdown: '#HEADING\r\n<h2>Heading 2>'
                }
            };

            serializer.serialize(card.render(opts)).should.match('<h1 id="heading">HEADING</h1>\n<h2>Heading 2>');
        });

        it('Renders nothing when payload is undefined', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    markdown: undefined
                }
            };

            serializer.serialize(card.render(opts)).should.match('');
        });
    });
});
