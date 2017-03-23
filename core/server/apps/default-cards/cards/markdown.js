var SimpleDom   = require('simple-dom'),
    tokenizer   = require('simple-html-tokenizer').tokenize,
    Showdown    = require('showdown-ghost'),
    converter   = new Showdown.converter({extensions: ['ghostgfm', 'footnotes', 'highlight']}),
    parser;

module.exports = {
        name: 'card-markdown',
        type: 'dom',
        render(opts) {
            parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);
            return parser.parse('<div class="kg-card-markdown">' + converter.makeHtml(opts.payload.markdown || '') + '</div>');
        }
    };
