const assert = require('assert');
const ObjectID = require('bson-objectid');
const Mention = require('../lib/Mention');

const validInput = {
    source: 'https://source.com',
    target: 'https://target.com',
    sourceTitle: 'Title!',
    sourceExcerpt: 'Excerpt!'
};

describe('Mention', function () {
    describe('toJSON', function () {
        it('Returns a object with the expected properties', async function () {
            const mention = await Mention.create(validInput);
            const actual = Object.keys(mention.toJSON());
            const expected = [
                'id',
                'source',
                'target',
                'timestamp',
                'payload',
                'resourceId',
                'sourceTitle',
                'sourceExcerpt',
                'sourceFavicon',
                'sourceFeaturedImage'
            ];
            assert.deepEqual(actual, expected);
        });
    });

    describe('create', function () {
        it('Will error with invalid inputs', async function () {
            const invalidInputs = [
                {id: 'Not valid ID'},
                {id: 123},
                {source: 'Not a valid source'},
                {target: 'Not a valid target'},
                {timestamp: 'Not a valid timestamp'},
                {resourceId: 'Invalid resourceId'},
                {sourceTitle: null},
                {sourceTitle: 123},
                {sourceTitle: Array.from({length: 200}).join('A')},
                {sourceExcerpt: null},
                {sourceExcerpt: 123},
                {sourceExcerpt: Array.from({length: 3000}).join('A')},
                {sourceFavicon: 'Invalid source favicon'},
                {sourceFeaturedImage: 'Invalid source featured image'}
            ];

            for (const invalidInput of invalidInputs) {
                let errored = false;
                try {
                    await Mention.create({
                        ...validInput,
                        ...invalidInput
                    });
                } catch (err) {
                    errored = true;
                } finally {
                    if (!errored) {
                        assert.fail(`Should have errored with invalid input ${JSON.stringify(invalidInput)}`);
                    }
                }
            }
        });

        it('Will not error with valid inputs', async function () {
            const validInputs = [
                {id: new ObjectID()},
                {source: new URL('https://source.com/')},
                {target: new URL('https://target.com/')},
                {timestamp: new Date()},
                {timestamp: '2023-01-01T00:00:00Z'},
                {payload: {extra: 'shit'}},
                {resourceId: new ObjectID()},
                {sourceFavicon: 'https://source.com/favicon.ico'},
                {sourceFavicon: new URL('https://source.com/favicon.ico')},
                {sourceFeaturedImage: 'https://source.com/assets/image.jpg'},
                {sourceFeaturedImage: new URL('https://source.com/assets/image.jpg')}
            ];

            for (const localValidInput of validInputs) {
                await Mention.create({
                    ...validInput,
                    ...localValidInput
                });
            }
        });
    });
});
