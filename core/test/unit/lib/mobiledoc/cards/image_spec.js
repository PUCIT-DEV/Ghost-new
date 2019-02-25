const should = require('should');
const card = require('../../../../../server/lib/mobiledoc/cards/image');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Image card', function () {
    it('renders an image', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: image--><figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image"></figure><!--kg-card-end: image-->');
    });

    it('renders an image with caption', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                caption: '<b>Test caption</b>'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: image--><figure class="kg-card kg-image-card kg-card-hascaption"><img src="https://www.ghost.org/image.png" class="kg-image"><figcaption><b>Test caption</b></figcaption></figure><!--kg-card-end: image-->');
    });

    it('renders an image with alt text', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                alt: 'example image'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: image--><figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image" alt="example image"></figure><!--kg-card-end: image-->');
    });

    it('renders an image with title attribute', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: 'https://www.ghost.org/image.png',
                title: 'example image'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: image--><figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image" title="example image"></figure><!--kg-card-end: image-->');
    });

    it('renders nothing with no src', function () {
        let opts = {
            env: {
                dom: new SimpleDom.Document()
            },
            payload: {
                src: '',
                caption: 'Test caption'
            }
        };

        serializer.serialize(card.render(opts)).should.eql('');
    });

    describe('sizes', function () {
        it('standard', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: ''
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: image--><figure class="kg-card kg-image-card"><img src="https://www.ghost.org/image.png" class="kg-image"></figure><!--kg-card-end: image-->');
        });

        it('wide', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: 'wide'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: image--><figure class="kg-card kg-image-card kg-width-wide"><img src="https://www.ghost.org/image.png" class="kg-image"></figure><!--kg-card-end: image-->');
        });

        it('full', function () {
            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                },
                payload: {
                    src: 'https://www.ghost.org/image.png',
                    cardWidth: 'full'
                }
            };

            serializer.serialize(card.render(opts)).should.eql('<!--kg-card-begin: image--><figure class="kg-card kg-image-card kg-width-full"><img src="https://www.ghost.org/image.png" class="kg-image"></figure><!--kg-card-end: image-->');
        });
    });
});
