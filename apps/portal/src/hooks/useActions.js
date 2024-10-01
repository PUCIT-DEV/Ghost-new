import React from 'react';
import AppContext from '../AppContext';
import setupGhostApi from '../utils/api';
import useHumanReadableError from './useHumanReadableError';
import {createPopupNotification, getMemberEmail, getMemberName, getProductCadenceFromPrice, removePortalLinkFromUrl, getRefDomain} from '../utils/helpers';

export const useActions = () => {
    const {state, api} = React.useContext(AppContext);
    const {getMessageFromError} = useHumanReadableError();

    const switchPage = React.useCallback(({page, lastPage, pageData}) => ({
        page,
        popupNotification: null,
        lastPage: lastPage || null,
        pageData: pageData || state.pageData
    }), [state.pageData]);

    const togglePopup = React.useCallback(() => ({
        showPopup: !state.showPopup
    }), [state.showPopup]);

    const openPopup = React.useCallback(({page, pageQuery, pageData}) => ({
        showPopup: true,
        page,
        ...(pageQuery ? {pageQuery} : {}),
        ...(pageData ? {pageData} : {})
    }), []);

    const back = React.useCallback(() => {
        if (state.lastPage) {
            return {
                page: state.lastPage
            };
        } else {
            return closePopup();
        }
    }, [state.lastPage, closePopup]);

    const closePopup = React.useCallback(() => {
        removePortalLinkFromUrl();
        return {
            showPopup: false,
            lastPage: null,
            pageQuery: '',
            popupNotification: null,
            page: state.page === 'magiclink' ? '' : state.page
        };
    }, [state.page]);

    const openNotification = React.useCallback(({type, message}) => ({
        showNotification: true,
        type,
        message
    }), []);

    const closeNotification = React.useCallback(() => ({
        showNotification: false
    }), []);

    const signout = React.useCallback(async () => {
        try {
            await api.member.signout();
            return {
                action: 'signout:success'
            };
        } catch (e) {
            return {
                action: 'signout:failed',
                popupNotification: createPopupNotification({
                    type: 'signout:failed', autoHide: false, closeable: true, state, status: 'error',
                    message: 'Failed to log out, please try again'
                })
            };
        }
    }, [api.member, state]);

    const signin = React.useCallback(async (data) => {
        try {
            const integrityToken = await api.member.getIntegrityToken();
            await api.member.sendMagicLink({...data, emailType: 'signin', integrityToken});
            return {
                page: 'magiclink',
                lastPage: 'signin'
            };
        } catch (e) {
            return {
                action: 'signin:failed',
                popupNotification: createPopupNotification({
                    type: 'signin:failed', autoHide: false, closeable: true, state, status: 'error',
                    message: getMessageFromError(e, 'Failed to log in, please try again')
                })
            };
        }
    }, [api.member, state, getMessageFromError]);

    const signup = React.useCallback(async (data) => {
        try {
            let {plan, tierId, cadence, email, name, newsletters, offerId} = data;

            if (plan.toLowerCase() === 'free') {
                const integrityToken = await api.member.getIntegrityToken();
                await api.member.sendMagicLink({emailType: 'signup', integrityToken, ...data});
            } else {
                if (tierId && cadence) {
                    await api.member.checkoutPlan({plan, tierId, cadence, email, name, newsletters, offerId});
                } else {
                    ({tierId, cadence} = getProductCadenceFromPrice({site: state?.site, priceId: plan}));
                    await api.member.checkoutPlan({plan, tierId, cadence, email, name, newsletters, offerId});
                }
                return {
                    page: 'loading'
                };
            }
            return {
                page: 'magiclink',
                lastPage: 'signup'
            };
        } catch (e) {
            const message = e?.message || 'Failed to sign up, please try again';
            return {
                action: 'signup:failed',
                popupNotification: createPopupNotification({
                    type: 'signup:failed', autoHide: false, closeable: true, state, status: 'error',
                    message
                })
            };
        }
    }, [api.member, state]);

    const checkoutPlan = React.useCallback(async (data) => {
        try {
            let {plan, offerId, tierId, cadence} = data;
            if (!tierId || !cadence) {
                ({tierId, cadence} = getProductCadenceFromPrice({site: state?.site, priceId: plan}));
            }
            await api.member.checkoutPlan({
                plan,
                tierId,
                cadence,
                offerId,
                metadata: {
                    checkoutType: 'upgrade'
                }
            });
        } catch (e) {
            return {
                action: 'checkoutPlan:failed',
                popupNotification: createPopupNotification({
                    type: 'checkoutPlan:failed', autoHide: false, closeable: true, state, status: 'error',
                    message: 'Failed to process checkout, please try again'
                })
            };
        }
    }, [api.member, state]);

    const updateSubscription = React.useCallback(async (data) => {
        try {
            const {plan, planId, subscriptionId, cancelAtPeriodEnd} = data;
            const {tierId, cadence} = getProductCadenceFromPrice({site: state?.site, priceId: planId});

            await api.member.updateSubscription({
                planName: plan,
                tierId,
                cadence,
                subscriptionId,
                cancelAtPeriodEnd,
                planId: planId
            });
            const member = await api.member.sessionData();
            const action = 'updateSubscription:success';
            return {
                action,
                popupNotification: createPopupNotification({
                    type: action, autoHide: true, closeable: true, state, status: 'success',
                    message: 'Subscription plan updated successfully'
                }),
                page: 'accountHome',
                member: member
            };
        } catch (e) {
            return {
                action: 'updateSubscription:failed',
                popupNotification: createPopupNotification({
                    type: 'updateSubscription:failed', autoHide: false, closeable: true, state, status: 'error',
                    message: 'Failed to update subscription, please try again'
                })
            };
        }
    }, [api.member, state]);

    const cancelSubscription = React.useCallback(async (data) => {
        try {
            const {subscriptionId, cancellationReason} = data;
            await api.member.updateSubscription({
                subscriptionId, smartCancel: true, cancellationReason
            });
            const member = await api.member.sessionData();
            const action = 'cancelSubscription:success';
            return {
                action,
                page: 'accountHome',
                member: member
            };
        } catch (e) {
            return {
                action: 'cancelSubscription:failed',
                popupNotification: createPopupNotification({
                    type: 'cancelSubscription:failed', autoHide: false, closeable: true, state, status: 'error',
                    message: 'Failed to cancel subscription, please try again'
                })
            };
        }
    }, [api.member]);

    const continueSubscription = React.useCallback(async (data) => {
        try {
            const {subscriptionId} = data;
            await api.member.updateSubscription({
                subscriptionId, cancelAtPeriodEnd: false
            });
            const member = await api.member.sessionData();
            const action = 'continueSubscription:success';
            return {
                action,
                page: 'accountHome',
                member: member
            };
        } catch (e) {
            return {
                action: 'continueSubscription:failed',
                popupNotification: createPopupNotification({
                    type: 'continueSubscription:failed', autoHide: false, closeable: true, state, status: 'error',
                    message: 'Failed to cancel subscription, please try again'
                })
            };
        }
    }, [api.member, state]);

    const editBilling = React.useCallback(async (data) => {
        try {
            await api.member.editBilling(data);
        } catch (e) {
            return {
                action: 'editBilling:failed',
                popupNotification: createPopupNotification({
                    type: 'editBilling:failed', autoHide: false, closeable: true, state, status: 'error',
                    message: 'Failed to update billing information, please try again'
                })
            };
        }
    }, [api.member, state]);

    const clearPopupNotification = React.useCallback(async () => ({
        popupNotification: null
    }), []);

    const showPopupNotification = React.useCallback(async (data) => {
        let {action, message = ''} = data;
        action = action || 'showPopupNotification:success';
        return {
            popupNotification: createPopupNotification({
                type: action,
                autoHide: true,
                closeable: true,
                state,
                status: 'success',
                message
            })
        };
    }, [state]);

    const updateNewsletterPreference = React.useCallback(async (data) => {
        try {
            const {newsletters, enableCommentNotifications} = data;
            if (!newsletters && enableCommentNotifications === undefined) {
                return {};
            }
            const updateData = {};
            if (newsletters) {
                updateData.newsletters = newsletters;
            }
            if (enableCommentNotifications !== undefined) {
                updateData.enableCommentNotifications = enableCommentNotifications;
            }
            const member = await api.member.update(updateData);
            const action = 'updateNewsletterPref:success';
            return {
                action,
                member
            };
        } catch (e) {
            return {
                action: 'updateNewsletterPref:failed',
                popupNotification: createPopupNotification({
                    type: 'updateNewsletter:failed',
                    autoHide: true, closeable: true, state, status: 'error',
                    message: 'Failed to update newsletter settings'
                })
            };
        }
    }, [api.member, state]);

    const removeEmailFromSuppressionList = React.useCallback(async () => {
        try {
            await api.member.deleteSuppression();
            const action = 'removeEmailFromSuppressionList:success';
            return {
                action,
                popupNotification: createPopupNotification({
                    type: 'removeEmailFromSuppressionList:success', autoHide: true, closeable: true, state, status: 'success',
                    message: 'You have been successfully resubscribed'
                })
            };
        } catch (e) {
            return {
                action: 'removeEmailFromSuppressionList:failed',
                popupNotification: createPopupNotification({
                    type: 'removeEmailFromSuppressionList:failed',
                    autoHide: true, closeable: true, state, status: 'error',
                    message: 'Your email has failed to resubscribe, please try again'
                })
            };
        }
    }, [api.member, state]);

    const updateNewsletter = React.useCallback(async (data) => {
        try {
            const {subscribed} = data;
            const member = await api.member.update({subscribed});
            if (!member) {
                throw new Error('Failed to update newsletter');
            }
            const action = 'updateNewsletter:success';
            return {
                action,
                member: member,
                popupNotification: createPopupNotification({
                    type: action, autoHide: true, closeable: true, state, status: 'success',
                    message: 'Email newsletter settings updated'
                })
            };
        } catch (e) {
            return {
                action: 'updateNewsletter:failed',
                popupNotification: createPopupNotification({
                    type: 'updateNewsletter:failed', autoHide: true, closeable: true, state, status: 'error',
                    message: 'Failed to update newsletter settings'
                })
            };
        }
    }, [api.member, state]);

    const updateMemberEmail = React.useCallback(async (data) => {
        const {email} = data;
        const originalEmail = getMemberEmail({member: state.member});
        if (email !== originalEmail) {
            try {
                await api.member.updateEmailAddress({email});
                return {
                    success: true
                };
            } catch (err) {
                return {
                    success: false,
                    error: err
                };
            }
        }
        return null;
    }, [api.member, state]);

    const updateMemberData = React.useCallback(async (data) => {
        const {name} = data;
        const originalName = getMemberName({member: state.member});
        if (originalName !== name) {
            try {
                const member = await api.member.update({name});
                if (!member) {
                    throw new Error('Failed to update member');
                }
                return {
                    member,
                    success: true
                };
            } catch (err) {
                return {
                    success: false,
                    error: err
                };
            }
        }
        return null;
    }, [api.member, state]);

    const refreshMemberData = React.useCallback(async () => {
        if (state.member) {
            try {
                const member = await api.member.sessionData();
                if (member) {
                    return {
                        member,
                        success: true,
                        action: 'refreshMemberData:success'
                    };
                }
                return null;
            } catch (err) {
                return {
                    success: false,
                    error: err,
                    action: 'refreshMemberData:failed'
                };
            }
        }
        return null;
    }, [api.member, state]);

    const updateProfile = React.useCallback(async (data) => {
        const [dataUpdate, emailUpdate] = await Promise.all([updateMemberData(data), updateMemberEmail(data)]);
        if (dataUpdate && emailUpdate) {
            if (emailUpdate.success) {
                return {
                    action: 'updateProfile:success',
                    ...(dataUpdate.success ? {member: dataUpdate.member} : {}),
                    page: 'accountHome',
                    popupNotification: createPopupNotification({
                        type: 'updateProfile:success', autoHide: true, closeable: true, status: 'success', state,
                        message: 'Check your inbox to verify email update'
                    })
                };
            }
            const message = !dataUpdate.success ? 'Failed to update account data' : 'Failed to send verification email';

            return {
                action: 'updateProfile:failed',
                ...(dataUpdate.success ? {member: dataUpdate.member} : {}),
                popupNotification: createPopupNotification({
                    type: 'updateProfile:failed', autoHide: true, closeable: true, status: 'error', message, state
                })
            };
        } else if (dataUpdate) {
            const action = dataUpdate.success ? 'updateProfile:success' : 'updateProfile:failed';
            const status = dataUpdate.success ? 'success' : 'error';
            const message = !dataUpdate.success ? 'Failed to update account details' : 'Account details updated successfully';
            return {
                action,
                ...(dataUpdate.success ? {member: dataUpdate.member} : {}),
                ...(dataUpdate.success ? {page: 'accountHome'} : {}),
                popupNotification: createPopupNotification({
                    type: action, autoHide: dataUpdate.success, closeable: true, status, state, message
                })
            };
        } else if (emailUpdate) {
            const action = emailUpdate.success ? 'updateProfile:success' : 'updateProfile:failed';
            const status = emailUpdate.success ? 'success' : 'error';
            const message = !emailUpdate.success ? 'Failed to send verification email' : 'Check your inbox to verify email update';
            return {
                action,
                ...(emailUpdate.success ? {page: 'accountHome'} : {}),
                popupNotification: createPopupNotification({
                    type: action, autoHide: emailUpdate.success, closeable: true, status, state, message
                })
            };
        }
        return {
            action: 'updateProfile:success',
            page: 'accountHome',
            popupNotification: createPopupNotification({
                type: 'updateProfile:success', autoHide: true, closeable: true, status: 'success', state,
                message: 'Account details updated successfully'
            })
        };
    }, [updateMemberData, updateMemberEmail, state]);

    const oneClickSubscribe = React.useCallback(async ({siteUrl}) => {
        const externalSiteApi = setupGhostApi({siteUrl: siteUrl, apiUrl: 'not-defined', contentApiKey: 'not-defined'});
        const {member} = state;

        const referrerUrl = window.location.href;
        const referrerSource = getRefDomain();

        const integrityToken = await externalSiteApi.member.getIntegrityToken();
        await externalSiteApi.member.sendMagicLink({
            emailType: 'signup',
            name: member.name,
            email: member.email,
            autoRedirect: false,
            integrityToken,
            customUrlHistory: state.site.outbound_link_tagging ? [
                {
                    time: Date.now(),
                    referrerSource,
                    referrerMedium: 'Ghost Recommendations',
                    referrerUrl
                }
            ] : []
        });

        return {};
    }, [state]);

    const trackRecommendationClicked = React.useCallback(({recommendationId}) => {
        try {
            const existing = localStorage.getItem('ghost-recommendations-clicked');
            const clicked = existing ? JSON.parse(existing) : [];
            if (clicked.includes(recommendationId)) {
                // Already tracked
                return;
            }
            clicked.push(recommendationId);
            localStorage.setItem('ghost-recommendations-clicked', JSON.stringify(clicked));
        } catch (e) {
            // Ignore localstorage errors (browser not supported or in private mode)
        }
        api.recommendations.trackClicked({
            recommendationId
        });

        return {};
    }, []);

    const trackRecommendationSubscribed = React.useCallback(({recommendationId}) => {
        api.recommendations.trackSubscribed({
            recommendationId
        });

        return {};
    }, [api.recommendations]);

    return {
        switchPage,
        togglePopup,
        openPopup,
        back,
        closePopup,
        openNotification,
        closeNotification,
        signout,
        signin,
        signup,
        updateSubscription,
        cancelSubscription,
        continueSubscription,
        updateNewsletter,
        updateProfile,
        refreshMemberData,
        clearPopupNotification,
        editBilling,
        checkoutPlan,
        updateNewsletterPreference,
        showPopupNotification,
        removeEmailFromSuppressionList,
        oneClickSubscribe,
        trackRecommendationClicked,
        trackRecommendationSubscribed
    };
};

export default useActions;