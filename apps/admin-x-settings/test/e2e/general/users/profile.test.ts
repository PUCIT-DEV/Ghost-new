import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '../../../utils/e2e';

test.describe('User profile', async () => {
    test('Supports editing user profiles', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=all&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    email: 'newadmin@test.com',
                    name: 'New Admin'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.getByLabel('Full name').fill('New Admin');
        await modal.getByLabel('Email').fill('newadmin@test.com');
        await modal.getByLabel('Slug').fill('newadmin');
        await modal.getByLabel('Location').fill('some location');
        await modal.getByLabel('Website').fill('https://example.com');
        await modal.getByLabel('Facebook profile').fill('some fb');
        await modal.getByLabel('Twitter profile').fill('some tw');
        await modal.getByLabel('Bio').fill('some bio');

        await modal.getByLabel(/New paid members/).uncheck();
        await modal.getByLabel(/Paid member cancellations/).check();

        await modal.getByRole('button', {name: 'Save & close'}).click();

        await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

        await expect(listItem.getByText('New Admin')).toBeVisible();
        await expect(listItem.getByText('newadmin@test.com')).toBeVisible();

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                email: 'newadmin@test.com',
                name: 'New Admin',
                slug: 'newadmin',
                location: 'some location',
                website: 'https://example.com',
                facebook: 'some fb',
                twitter: 'some tw',
                bio: 'some bio',
                paid_subscription_started_notification: false,
                paid_subscription_canceled_notification: true
            }]
        });
    });

    test('Supports changing password', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=all&include=roles', response: responseFixtures.users},
            updatePassword: {method: 'PUT', path: '/users/password/', response: {}}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.getByRole('button', {name: 'Change password'}).click();

        await modal.getByLabel('New password').fill('newpassword');
        await modal.getByLabel('Verify password').fill('newpassword');

        await modal.getByRole('button', {name: 'Change password'}).click();

        await expect(modal.getByRole('button', {name: 'Updated'})).toBeVisible();

        expect(lastApiRequests.updatePassword?.body).toMatchObject({
            password: [{
                newPassword: 'newpassword',
                ne2Password: 'newpassword',
                oldPassword: '',
                user_id: responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!.id
            }]
        });
    });

    test('Supports uploading profile picture', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'owner@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=all&include=roles', response: responseFixtures.users},
            uploadImage: {method: 'POST', path: '/images/upload/', response: {images: [{url: 'http://example.com/image.png', ref: null}]}},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    profile_image: 'http://example.com/image.png',
                    cover_image: 'http://example.com/image.png'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');

        const wrapper = section.getByTestId('owner-user');
        await wrapper.hover();
        await wrapper.getByRole('button', {name: 'Edit'}).click();

        // Upload profile picture

        const modal = page.getByTestId('user-detail-modal');

        const profileFileChooserPromise = page.waitForEvent('filechooser');

        await modal.locator('label[for=avatar]').click();

        const profileFileChooser = await profileFileChooserPromise;
        await profileFileChooser.setFiles(`${__dirname}/../../../utils/images/image.png`);

        await expect(modal.locator('#avatar')).toHaveAttribute('src', 'http://example.com/image.png');

        // Upload cover image

        const coverFileChooserPromise = page.waitForEvent('filechooser');

        await modal.locator('label[for=cover-image]').click();

        const coverFileChooser = await coverFileChooserPromise;
        await coverFileChooser.setFiles(`${__dirname}/../../../utils/images/image.png`);

        await expect(modal.locator('#cover-image')).toHaveAttribute('src', 'http://example.com/image.png');

        // Save the user

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                email: 'owner@test.com',
                profile_image: 'http://example.com/image.png',
                cover_image: 'http://example.com/image.png'
            }]
        });
    });
});
