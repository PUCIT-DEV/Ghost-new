const should = require('should');
const sinon = require('sinon');

const Notifications = require('../../../../core/server/services/notifications/notifications');
const {owner} = require('../../../utils/fixtures/context');

describe('Notifications Service', function () {
    it('can browse version upgrade notifications notifications in Ghost v3', function () {
        const settingsCache = {
            get: sinon.fake.returns([{
                dismissible: true,
                location: 'bottom',
                status: 'alert',
                id: '130f7c24-113a-4768-a698-12a8b34223f5',
                custom: true,
                createdAt: '2021-03-16T12:55:20.000Z',
                type: 'info',
                top: true,
                message: `<strong>Ghost 4.0 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features. <a href=\'https://ghost.org/changelog/4/\' target=\'_blank\' rel=\'noopener\'>Read more!</a>`,
                seen: true,
                addedAt: '2021-03-17T01:41:20.906Z',
                seenBy: ['1']
            }
            ])
        };

        const notificationSvc = new Notifications({
            settingsCache,
            ghostVersion: {
                full: '3.0.0'
            }
        });

        const notifications = notificationSvc.browse({user: owner});

        should.exist(notifications);
        notifications.length.should.equal(1);
    });

    it('cannot see 2.0 version upgrade notifications notifications in Ghost v3', function () {
        const settingsCache = {
            get: sinon.fake.returns([{
                dismissible: true,
                location: 'bottom',
                status: 'alert',
                id: '130f7c24-113a-4768-a698-12a8b34223f5',
                custom: true,
                createdAt: '2021-03-16T12:55:20.000Z',
                type: 'info',
                top: true,
                message: `<strong>Ghost 2.0 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features.`,
                seen: true,
                addedAt: '2021-03-17T01:41:20.906Z',
                seenBy: ['1']
            }
            ])
        };

        const notificationSvc = new Notifications({
            settingsCache,
            ghostVersion: {
                full: '3.0.0'
            }
        });

        const notifications = notificationSvc.browse({user: owner});

        should.exist(notifications);
        notifications.length.should.equal(0);
    });
});
