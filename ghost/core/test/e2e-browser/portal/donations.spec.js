const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createMember, impersonateMember, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Donations', () => {
        test('Can donate as an anonymous member', async ({sharedPage}) => {
            // go to website and open portal
            await sharedPage.goto('/#/portal/support');

            await sharedPage.locator('#customUnitAmount').fill('12.50');
            await sharedPage.locator('#email').fill('member-donation-test-1@ghost.org');
            await completeStripeSubscription(sharedPage);

            // Check success message
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you!')).toBeVisible();
        });

        // This test is broken because the impersonate is not working!
        test('Can donate as a logged in free member', async ({sharedPage}) => {
            // create a new free member
            await createMember(sharedPage, {
                name: 'Test Member Donations',
                email: 'test.member.donations@example.com',
                note: 'Test Member'
            });

            // impersonate the member on frontend
            await impersonateMember(sharedPage);

            await sharedPage.goto('#/portal/support');

            // Don't need to fill email as it's already filled
            await sharedPage.locator('#customUnitAmount').fill('12.50');
            await completeStripeSubscription(sharedPage);

            // Check success message
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you!')).toBeVisible();
        });

        test('Can donate with a fixed amount set and different currency', async ({sharedPage}) => {
            await sharedPage.goto('/ghost/#/settings');

            const section = sharedPage.getByTestId('tips-or-donations');

            await section.getByRole('button', {name: 'Edit'}).click();
            await section.getByLabel('Suggested amount').fill('98');
            const select = section.getByLabel('Currency');
            await select.click();
            await sharedPage.locator(`[data-testid="select-option"][data-value="EUR"]`).click();
            await section.getByRole('button', {name: 'Save'}).click();
            await expect(select).not.toBeVisible();

            // go to website and open portal
            await sharedPage.goto('/#/portal/support');

            await sharedPage.locator('#email').fill('member-donation-test-3@ghost.org');

            const totalAmount = sharedPage.getByTestId('product-summary-total-amount');
            await expect(totalAmount).toHaveText('€98.00');

            await completeStripeSubscription(sharedPage);

            // Check success message
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you!')).toBeVisible();
        });
    });
});
