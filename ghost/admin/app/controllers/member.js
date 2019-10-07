import Controller from '@ember/controller';
import moment from 'moment';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    members: controller(),
    store: service(),

    router: service(),

    member: alias('model'),

    subscribedAt: computed('member.createdAt', function () {
        let memberSince = moment(this.member.createdAt).from(moment());
        let createdDate = moment(this.member.createdAt).format('MMM DD, YYYY');
        return `${createdDate} (${memberSince})`;
    }),

    actions: {
        setProperty() {
            return;
        },
        toggleDeleteTagModal() {
            this.toggleProperty('showDeleteMemberModal');
        },
        finaliseDeletion() {
            // decrememnt the total member count manually so there's no flash
            // when transitioning back to the members list
            if (this.members.meta) {
                this.members.decrementProperty('meta.pagination.total');
            }
            this.router.transitionTo('members');
        }
    },

    fetchMember: task(function* (memberId) {
        this.set('isLoading', true);
        yield this.store.findRecord('member', memberId, {
            reload: true
        }).then((data) => {
            this.set('member', data);
            this.set('isLoading', false);
        });
    })

});
