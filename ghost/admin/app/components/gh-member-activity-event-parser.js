import Component from '@glimmer/component';
import moment from 'moment';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';

export default class EventTimeline extends Component {
    get parsedEvents() {
        if (!this.args.events) {
            return [];
        }

        return this.args.events.map((event) => {
            let subject = event.data.member.name || event.data.member.email;
            let icon = this.getIcon(event);
            let action = this.getAction(event);
            let object = this.getObject(event);
            let info = this.getInfo(event);
            let timestamp = moment(event.data.created_at).fromNow();

            return {
                member_id: event.data.member_id,
                icon,
                subject,
                action,
                object,
                info,
                timestamp
            };
        });
    }

    getIcon(event) {
        return event.type;
    }

    getAction(event) {
        if (event.type === 'signup_event') {
            return 'signed up';
        }

        if (event.type === 'login_event') {
            return 'logged in';
        }

        if (event.type === 'payment_event') {
            return 'made a payment';
        }

        if (event.type === 'newsletter_event') {
            if (event.data.subscribed) {
                return 'subscribed to';
            } else {
                return 'unsubscribed from';
            }
        }

        if (event.type === 'subscription_event') {
            if (event.data.from_plan === null) {
                return 'started';
            }

            if (event.data.to_plan === null) {
                return 'cancelled';
            }

            return 'changed';
        }

        if (event.type === 'email_opened_event') {
            return 'opened';
        }

        if (event.type === 'email_delivered_event') {
            return 'received';
        }

        if (event.type === 'email_failed_event') {
            return 'failed to receive';
        }
    }

    getObject(event) {
        if (event.type === 'newsletter_event') {
            return 'emails';
        }

        if (event.type === 'subscription_event') {
            return 'their subscription';
        }

        if (event.type.match?.(/^email_/)) {
            return 'an email';
        }

        return '';
    }

    getInfo(event) {
        if (event.type === 'subscription_event') {
            let mrrDelta = getNonDecimal(event.data.mrr_delta, event.data.currency);
            if (mrrDelta === 0) {
                return;
            }
            let sign = mrrDelta > 0 ? '+' : '-';
            let symbol = getSymbol(event.data.currency);
            return `(MRR ${sign}${symbol}${Math.abs(mrrDelta)})`;
        }
        return;
    }
}
