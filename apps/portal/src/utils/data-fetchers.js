import * as Fixtures from './fixtures';
import * as Sentry from '@sentry/react';
import {hasMode} from './check-mode';
import NotificationParser from './notifications';
import {isSigninAllowed, isInviteOnlySite} from './helpers';
import setupGhostApi from './api';
import {getProductFromId, getProductCadenceFromPrice, getPriceIdFromPageQuery, getQueryPrice, createPopupNotification, isSentryEventAllowed, getFirstpromoterId, getSiteDomain, isRecentMember} from './helpers';

export async function fetchData(props) {
    const {site: apiSiteData, member} = await fetchApiData(props);
    const {site: devSiteData, ...restDevData} = fetchDevData(props);
    const {site: linkSiteData, ...restLinkData} = fetchLinkData(apiSiteData, member);
    const {site: previewSiteData, ...restPreviewData} = fetchPreviewData();
    const {site: notificationSiteData, ...restNotificationData} = fetchNotificationData();
    let page = '';

    return {
        member,
        page,
        site: {
            ...apiSiteData,
            ...linkSiteData,
            ...previewSiteData,
            ...notificationSiteData,
            ...devSiteData,
            plans: {
                ...(devSiteData || {}).plans,
                ...(apiSiteData || {}).plans,
                ...(previewSiteData || {}).plans
            }
        },
        ...restDevData,
        ...restLinkData,
        ...restNotificationData,
        ...restPreviewData
    };
}

function fetchDevData(props) {
    if (hasMode(['dev']) && !props.customSiteUrl) {
        return {
            showPopup: true,
            site: Fixtures.site,
            member: Fixtures.member.free,
            page: 'accountEmail',
            ...Fixtures.paidMemberOnTier(),
            pageData: Fixtures.offer
        };
    }

    if (hasMode(['test'])) {
        return {
            showPopup: props.showPopup !== undefined ? props.showPopup : true
        };
    }
    return {};
}

function fetchPreviewData() {
    const [, qs] = window.location.hash.substr(1).split('?');
    if (hasMode(['preview'])) {
        let data = {};
        if (hasMode(['offerPreview'])) {
            data = fetchOfferQueryStrData(qs);
        } else {
            data = fetchQueryStrData(qs);
        }
        return {
            ...data,
            showPopup: true
        };
    }
    return {};
}

function fetchQueryStrData(qs = '') {
    const qsParams = new URLSearchParams(qs);
    const data = {
        site: {
            plans: {}
        }
    };

    if (qsParams.get('button')) {
        data.site.portal_button = JSON.parse(decodeURIComponent(qsParams.get('button')));
    }

    if (qsParams.get('name')) {
        data.site.name = qsParams.get('name');
    }

    if (qsParams.get('description')) {
        data.site.description = qsParams.get('description');
    }

    if (qsParams.get('icon')) {
        data.site.icon = qsParams.get('icon');
    }

    if (qsParams.get('logo')) {
        data.site.logo = qsParams.get('logo');
    }

    if (qsParams.get('accent_color')) {
        data.site.accent_color = qsParams.get('accent_color');
    }

    if (qsParams.get('locale')) {
        data.site.locale = qsParams.get('locale');
    }

    if (qsParams.get('plans')) {
        const plans = JSON.parse(decodeURIComponent(qsParams.get('plans')));
        data.site.plans = plans;
        plans.forEach((plan) => {
            const price = getQueryPrice(qsParams.get(plan.name));
            if (price) {
                plan.amount = price;
            }
        });
    }

    if (qsParams.get('page')) {
        data.page = qsParams.get('page');
    }

    if (qsParams.get('accentColor')) {
        data.site.accent_color = qsParams.get('accentColor');
    }

    if (qsParams.get('products')) {
        data.site.products = JSON.parse(decodeURIComponent(qsParams.get('products')));
    }

    if (qsParams.get('membersSignupAccess')) {
        data.site.members_signup_access = qsParams.get('membersSignupAccess');
    }

    if (qsParams.get('allowSelfSignup')) {
        data.site.allow_self_signup = qsParams.get('allowSelfSignup') === 'true';
    }

    if (qsParams.get('membersSupportAddress')) {
        data.site.members_support_address = qsParams.get('membersSupportAddress');
    }

    return data;
}

function fetchOfferQueryStrData(qs = '') {
    const qsParams = new URLSearchParams(qs);
    const data = {};

    if (qsParams.get('name')) {
        data.name = qsParams.get('name');
    }

    if (qsParams.get('code')) {
        data.code = qsParams.get('code');
    }

    if (qsParams.get('display_title')) {
        data.display_title = qsParams.get('display_title');
    }

    if (qsParams.get('display_description')) {
        data.display_description = qsParams.get('display_description');
    }

    if (qsParams.get('type')) {
        data.type = qsParams.get('type');
    }

    if (qsParams.get('cadence')) {
        data.cadence = qsParams.get('cadence');
    }

    if (qsParams.get('duration')) {
        data.duration = qsParams.get('duration');
    }

    if (qsParams.get('duration_in_months')) {
        data.duration_in_months = qsParams.get('duration_in_months');
    }

    if (qsParams.get('amount')) {
        data.amount = parseInt(qsParams.get('amount'));
    }

    if (qsParams.get('currency')) {
        data.currency = qsParams.get('currency');
    }

    if (qsParams.get('status')) {
        data.status = qsParams.get('status');
    }

    if (qsParams.get('tier')) {
        const tierId = qsParams.get('tier');
        data.tier = {
            id: tierId,
            ...getProductFromId(tierId)
        };
    }

    if (qsParams.get('product_id')) {
        const productId = qsParams.get('product_id');
        data.tier = {
            id: productId,
            ...getProductFromId(productId)
        };
    }

    if (qsParams.get('price_id')) {
        const priceId = qsParams.get('price_id');
        const cadence = getProductCadenceFromPrice(priceId);
        data.cadence = cadence;
    }

    if (qsParams.get('page_query')) {
        const pageQuery = qsParams.get('page_query');
        const priceId = getPriceIdFromPageQuery(pageQuery);
        const cadence = getProductCadenceFromPrice(priceId);
        data.cadence = cadence;
    }

    return {
        page: 'offer',
        pageData: data
    };
}

function fetchNotificationData() {
    const {type, status, duration, autoHide, closeable} = NotificationParser({billingOnly: true}) || {};
    if (['stripe:billing-update'].includes(type)) {
        if (status === 'success') {
            const popupNotification = createPopupNotification({
                type, status, duration, closeable, autoHide,
                message: status === 'success' ? 'Billing info updated successfully' : ''
            });
            return {
                showPopup: true,
                popupNotification
            };
        }
        return {
            showPopup: true
        };
    }
    return {};
}

function fetchLinkData(site, member) {
    const qParams = new URLSearchParams(window.location.search);
    let page, pageQuery, pageData;

    // Determine the page based on the action parameter
    if (qParams.get('action') === 'signup') {
        page = 'signup';
        pageQuery = qParams.get('plan') || '';
    } else if (qParams.get('action') === 'signin') {
        page = 'signin';
    } else if (qParams.get('action') === 'checkout') {
        page = 'checkout';
        pageQuery = qParams.get('plan') || '';
    } else if (qParams.get('action') === 'signup-paid') {
        page = 'signup-paid';
        pageQuery = qParams.get('plan') || '';
    } else if (qParams.get('action') === 'signup-paid-cancel') {
        page = 'signup-paid-cancel';
        pageQuery = qParams.get('plan') || '';
    } else if (qParams.get('action') === 'signup-success') {
        page = 'signup-success';
    }

    // If no specific action is set, determine the default page based on member status
    if (!page) {
        if (member) {
            page = 'accountHome';
        } else {
            page = isInviteOnlySite({site}) ? 'signin' : 'signup';
        }
    }

    // Set pageData if success and action parameters are present
    if (qParams.get('success') && qParams.get('action')) {
        pageData = {
            action: qParams.get('action'),
            success: qParams.get('success'),
            plan: qParams.get('plan') || '',
            message: qParams.get('message') || ''
        };
    }

    return {
        site: {
            ...site,
            plans: {
                ...(site && site.plans ? site.plans : {}),
                ...(isSigninAllowed({site}) ? {} : {
                    monthly: 0,
                    yearly: 0,
                    currency: 'USD',
                    currency_symbol: '$'
                })
            }
        },
        page,
        pageQuery,
        pageData,
        member
    };
}

async function fetchApiData({siteUrl, customSiteUrl, apiUrl, apiKey, api}) {
    try {
        let ghostApi = api || setupGhostApi({siteUrl, apiUrl, apiKey});
        const {site, member} = await ghostApi.init();

        const colorOverride = getColorOverride();
        if (colorOverride) {
            site.accent_color = colorOverride;
        }

        setupFirstPromoter({site, member});
        setupSentry({site});

        return {site, member};
    } catch (e) {
        if (hasMode(['dev', 'test'], {customSiteUrl})) {
            return {};
        }

        throw e;
    }
}

function getColorOverride() {
    const scriptTag = document.querySelector('script[data-ghost]');
    if (scriptTag && scriptTag.dataset.accentColor) {
        return scriptTag.dataset.accentColor;
    }
    return false;
}

function setupFirstPromoter({site, member}) {
    if (hasMode(['test'])) {
        return null;
    }
    const firstPromoterId = getFirstpromoterId({site});
    let siteDomain = getSiteDomain({site});
    // Replace any leading subdomain and prefix the siteDomain with
    // a `.` to allow the FPROM cookie to be accessible across all subdomains
    // or the root.
    siteDomain = siteDomain?.replace(/^(\S*\.)?(\S*\.\S*)$/i, '.$2');

    if (firstPromoterId && siteDomain) {
        const t = document.createElement('script');
        t.type = 'text/javascript';
        t.async = !0;
        t.src = 'https://cdn.firstpromoter.com/fprom.js';
        t.onload = t.onreadystatechange = function () {
            let _t = this.readyState;
            if (!_t || 'complete' === _t || 'loaded' === _t) {
                try {
                    window.$FPROM.init(firstPromoterId, siteDomain);
                    if (isRecentMember({member})) {
                        const email = member.email;
                        const uid = member.uuid;
                        if (window.$FPROM) {
                            window.$FPROM.trackSignup({email: email, uid: uid});
                        } else {
                            const _fprom = window._fprom || [];
                            window._fprom = _fprom;
                            _fprom.push(['event', 'signup']);
                            _fprom.push(['email', email]);
                            _fprom.push(['uid', uid]);
                        }
                    }
                } catch (err) {
                    // Log FP tracking failure
                }
            }
        };
        const e = document.getElementsByTagName('script')[0];
        e.parentNode.insertBefore(t, e);
    }
}

/** Setup Sentry */
function setupSentry({site}) {
    if (hasMode(['test'])) {
        return null;
    }
    const {portal_sentry: portalSentry, portal_version: portalVersion, version: ghostVersion} = site;
    // eslint-disable-next-line no-undef
    const appVersion = REACT_APP_VERSION || portalVersion;
    const releaseTag = `portal@${appVersion}|ghost@${ghostVersion}`;
    if (portalSentry && portalSentry.dsn) {
        Sentry.init({
            dsn: portalSentry.dsn,
            environment: portalSentry.env || 'development',
            release: releaseTag,
            beforeSend: (event) => {
                if (isSentryEventAllowed({event})) {
                    return event;
                }
                return null;
            },
            allowUrls: [
                /https?:\/\/((www)\.)?unpkg\.com\/@tryghost\/portal/
            ]
        });
    }
}