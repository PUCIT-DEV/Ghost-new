import Component from '@ember/component';
import {inject as service} from '@ember/service';

export default Component.extend({
    billing: service(),
    config: service(),
    ghostPaths: service(),
    ajax: service(),

    didInsertElement() {
        let fetchingSubscription = false;
        this.billing.getBillingIframe().src = this.billing.getIframeURL();

        window.addEventListener('message', (event) => {
            if (event && event.data && event.data.request === 'token') {
                const ghostIdentityUrl = this.get('ghostPaths.url').api('identities');

                this.ajax.request(ghostIdentityUrl).then((response) => {
                    const token = response && response.identities && response.identities[0] && response.identities[0].token;
                    this.billing.getBillingIframe().contentWindow.postMessage({
                        request: 'token',
                        response: token
                    }, '*');
                });

                // NOTE: the handler is placed here to avoid additional logic to check if iframe has loaded
                //       receiving a 'token' request is an indication that page is ready
                if (!fetchingSubscription && !this.billing.get('subscription')) {
                    fetchingSubscription = true;
                    this.billing.getBillingIframe().contentWindow.postMessage({
                        query: 'getSubscription',
                        response: 'subscription'
                    }, '*');
                }
            }

            if (event && event.data && event.data.subscription) {
                this.billing.set('subscription', event.data.subscription);
            }
        });
    }
});
