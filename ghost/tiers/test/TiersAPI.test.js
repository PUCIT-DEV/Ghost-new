const assert = require('assert');
const TiersAPI = require('../lib/TiersAPI');
const InMemoryTierRepository = require('../lib/InMemoryTierRepository');

describe('TiersAPI', function () {
    /** @type {TiersAPI.ITierRepository} */
    let repository;

    /** @type {TiersAPI} */
    let api;

    before(function () {
        repository = new InMemoryTierRepository();
        api = new TiersAPI({
            repository
        });
    });

    it('Can not create new free Tiers', async function () {
        let error;
        try {
            await api.add({
                name: 'My testing Tier',
                type: 'free'
            });
            error = null;
        } catch (err) {
            error = err;
        } finally {
            assert(error, 'An error should have been thrown');
        }
    });

    it('Can create new paid Tiers and find them again', async function () {
        const tier = await api.add({
            name: 'My testing Tier',
            type: 'paid',
            monthly_price: 5000,
            yearly_price: 50000,
            currency: 'usd'
        });

        const found = await api.read(tier.id.toHexString());

        assert(found);
    });

    it('Can edit a tier', async function () {
        const tier = await api.add({
            name: 'My testing Tier',
            type: 'paid',
            monthly_price: 5000,
            yearly_price: 50000,
            currency: 'usd'
        });

        const updated = await api.edit(tier.id.toHexString(), {
            name: 'Updated'
        });

        assert(updated.name === 'Updated');
    });

    it('Can browse tiers', async function () {
        const page = await api.browse();

        assert(page.data.length === 2);
        assert(page.meta.pagination.total === 2);
    });
});
