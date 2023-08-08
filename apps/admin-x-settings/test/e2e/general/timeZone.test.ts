import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Time zone settings', async () => {
    test('Supports editing the time zone', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'timezone', value: 'Asia/Tokyo'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('timezone');

        await expect(section.getByText('Etc/UTC')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Site timezone').selectOption('Asia/Tokyo');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Site timezone')).toHaveCount(0);

        await expect(section.getByText('Asia/Tokyo')).toHaveCount(1);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'timezone', value: 'Asia/Tokyo'}
            ]
        });
    });
});
