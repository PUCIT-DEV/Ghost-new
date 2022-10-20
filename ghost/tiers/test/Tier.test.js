const assert = require('assert');
const ObjectID = require('bson-objectid');
const Tier = require('../lib/Tier');

async function assertError(fn, checkError) {
    let error;
    try {
        await fn();
        error = false;
    } catch (err) {
        error = err;
    } finally {
        assert(error);
        if (checkError) {
            checkError(error);
        }
    }
}
const validInput = {
    name: 'Tier Name',
    slug: 'tier-name',
    description: 'My First Tier',
    welcomePageURL: null,
    status: 'active',
    visibility: 'public',
    type: 'paid',
    trialDays: 10,
    currency: 'usd',
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    benefits: []
};

const invalidInputs = [
    {id: [100]},
    {name: 100},
    {name: ('a').repeat(200)},
    {slug: ('slug').repeat(50)},
    {description: ['whatever?']},
    {description: ('b').repeat(200)},
    {welcomePageURL: {cool: 'beans'}},
    {status: 'something random'},
    {visibility: 'highly visible'},
    {type: 'comped'},
    {trialDays: -10},
    {trialDays: 10, type: 'free', currency: null, monthlyPrice: null, yearlyPrice: null},
    {currency: 'dollar bills'},
    {currency: 25},
    {currency: 'USD', type: 'free'},
    {monthlyPrice: 2000, type: 'free', trialDays: null, currency: null, yearlyPrice: null},
    {monthlyPrice: null},
    {monthlyPrice: -20},
    {monthlyPrice: 10000000000},
    {yearlyPrice: 2000, type: 'free', trialDays: null, monthlyPrice: null, currency: null},
    {yearlyPrice: null},
    {yearlyPrice: -20},
    {yearlyPrice: 10000000000},
    {createdAt: 'Today'},
    {updatedAt: 'Tomorrow'}
];

const validInputs = [
    {welcomePageURL: 'https://google.com'},
    {id: (new ObjectID()).toHexString()},
    {id: new ObjectID()},
    {type: 'free', currency: null, monthlyPrice: null, yearlyPrice: null, trialDays: null},
    {createdAt: new Date()},
    {updatedAt: new Date()},
    {status: undefined},
    {type: undefined},
    {visibility: undefined}
];

describe('Tier', function () {
    describe('create', function () {
        it('Errors if passed an invalid input', async function () {
            for (const invalidInput of invalidInputs) {
                let input = {};
                Object.assign(input, validInput, invalidInput);
                await assertError(async function () {
                    await Tier.create(input);
                });
            }
        });

        it('Does not error for valid inputs', async function () {
            for (const validInputItem of validInputs) {
                let input = {};
                Object.assign(input, validInput, validInputItem);
                await Tier.create(input);
            }
        });

        it('Can create a Tier with valid input', async function () {
            const tier = await Tier.create(validInput);

            const expectedProps = [
                'id',
                'slug',
                'name',
                'description',
                'welcomePageURL',
                'status',
                'visibility',
                'type',
                'trialDays',
                'currency',
                'monthlyPrice',
                'yearlyPrice',
                'createdAt',
                'updatedAt',
                'benefits'
            ];

            for (const prop of expectedProps) {
                assert(tier[prop] === tier.toJSON()[prop]);
            }
        });

        it('Errors when attempting to set invalid properties', async function () {
            const tier = await Tier.create(validInput);

            assertError(() => {
                tier.name = 20;
            });

            assertError(() => {
                tier.benefits = 20;
            });

            assertError(() => {
                tier.description = 20;
            });

            assertError(() => {
                tier.welcomePageURL = 20;
            });

            assertError(() => {
                tier.status = 20;
            });

            assertError(() => {
                tier.visibility = 20;
            });

            assertError(() => {
                tier.trialDays = 'one hundred';
            });

            assertError(() => {
                tier.currency = 'one hundred';
            });

            assertError(() => {
                tier.monthlyPrice = 'one hundred';
            });

            assertError(() => {
                tier.yearlyPrice = 'one hundred';
            });
        });
    });
});
