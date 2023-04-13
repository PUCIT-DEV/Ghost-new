import Component from '@glimmer/component';
import DeletePostsModal from './modals/delete-posts';
import EditPostsAccessModal from './modals/edit-posts-access';
import UnpublishPostsModal from './modals/unpublish-posts';
import nql from '@tryghost/nql';
import tpl from '@tryghost/tpl';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const messages = {
    deleted: {
        single: 'Post deleted successfully',
        multiple: '{count} posts deleted successfully'
    },
    unpublished: {
        single: 'Post successfully reverted to a draft',
        multiple: '{count} posts successfully reverted to drafts'
    },
    featured: {
        single: 'Post featured successfully',
        multiple: '{count} posts featured successfully'
    },
    unfeatured: {
        single: 'Post unfeatured successfully',
        multiple: '{count} posts unfeatured successfully'
    },
    accessUpdated: {
        single: 'Post access successfully updated',
        multiple: 'Post access successfully updated for {count} posts'
    }
};

export default class PostsContextMenu extends Component {
    @service ajax;
    @service ghostPaths;
    @service session;
    @service infinity;
    @service store;
    @service notifications;

    get menu() {
        return this.args.menu;
    }

    get selectionList() {
        return this.menu.selectionList;
    }

    #getToastMessage(type) {
        if (this.selectionList.isSingle) {
            return tpl(messages[type].single);
        }
        return tpl(messages[type].multiple, {count: this.selectionList.count});
    }

    @action
    async featurePosts() {
        this.menu.performTask(this.featurePostsTask);
    }

    @action
    async unfeaturePosts() {
        this.menu.performTask(this.unfeaturePostsTask);
    }

    @action
    async deletePosts() {
        this.menu.openModal(DeletePostsModal, {
            selectionList: this.selectionList,
            confirm: this.deletePostsTask
        });
    }

    @action
    async unpublishPosts() {
        await this.menu.openModal(UnpublishPostsModal, {
            selectionList: this.selectionList,
            confirm: this.unpublishPostsTask
        });
    }

    @action
    async editPostsAccess() {
        this.menu.openModal(EditPostsAccessModal, {
            selectionList: this.selectionList,
            confirm: this.editPostsAccessTask
        });
    }

    @task
    *deletePostsTask() {
        const deletedModels = this.selectionList.availableModels;
        yield this.performBulkDestroy();
        this.notifications.showNotification(this.#getToastMessage('deleted'), {type: 'success'});

        const remainingModels = this.selectionList.infinityModel.content.filter((model) => {
            return !deletedModels.includes(model);
        });
        // Deleteobjects method from infintiymodel is broken for all models except the first page, so we cannot use this
        this.infinity.replace(this.selectionList.infinityModel, remainingModels);
        this.selectionList.clearSelection();
        return true;
    }

    @task
    *unpublishPostsTask() {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('unpublish');
        this.notifications.showNotification(this.#getToastMessage('unpublished'), {type: 'success'});

        // Update the models on the client side
        for (const post of updatedModels) {
            if (post.status === 'published' || post.status === 'sent') {
                // We need to do it this way to prevent marking the model as dirty
                this.store.push({
                    data: {
                        id: post.id,
                        type: 'post',
                        attributes: {
                            status: 'draft'
                        }
                    }
                });
            }
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        return true;
    }

    updateFilteredPosts() {
        const updatedModels = this.selectionList.availableModels;
        const filter = this.selectionList.allFilter;
        const filterNql = nql(filter);

        const remainingModels = this.selectionList.infinityModel.content.filter((model) => {
            if (!updatedModels.find(u => u.id === model.id)) {
                return true;
            }
            return filterNql.queryJSON(model);
        });
        // Deleteobjects method from infintiymodel is broken for all models except the first page, so we cannot use this
        this.infinity.replace(this.selectionList.infinityModel, remainingModels);
    }

    @task
    *editPostsAccessTask(close, {visibility, tiers}) {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('access', {visibility, tiers});
        this.notifications.showNotification(this.#getToastMessage('accessUpdated'), {type: 'success'});

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: 'post',
                    attributes: {
                        visibility
                    },
                    relationships: {
                        links: {
                            data: tiers
                        }
                    }
                }
            });
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        close();
    }

    @task
    *featurePostsTask() {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('feature');

        this.notifications.showNotification(this.#getToastMessage('featured'), {type: 'success'});

         // Update the models on the client side
         for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: 'post',
                    attributes: {
                        featured: true
                    }
                }
            });
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        return true;
    }

    @task
    *unfeaturePostsTask() {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('unfeature');

        this.notifications.showNotification(this.#getToastMessage('unfeatured'), {type: 'success'});

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: 'post',
                    attributes: {
                        featured: false
                    }
                }
            });
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        return true;
    }

    async performBulkDestroy() {
        const filter = this.selectionList.filter;
        let bulkUpdateUrl = this.ghostPaths.url.api(`posts`) + `?filter=${encodeURIComponent(filter)}`;
        return await this.ajax.delete(bulkUpdateUrl);
    }

    async performBulkEdit(_action, meta = {}) {
        const filter = this.selectionList.filter;
        let bulkUpdateUrl = this.ghostPaths.url.api(`posts/bulk`) + `?filter=${encodeURIComponent(filter)}`;
        return await this.ajax.put(bulkUpdateUrl, {
            data: {
                bulk: {
                    action: _action,
                    meta
                }
            }
        });
    }

    get shouldFeatureSelection() {
        let featuredCount = 0;
        for (const m of this.selectionList.availableModels) {
            if (m.featured) {
                featuredCount += 1;
            }
        }
        return featuredCount <= this.selectionList.availableModels.length / 2;
    }

    get canFeatureSelection() {
        for (const m of this.selectionList.availableModels) {
            if (m.get('status') !== 'sent') {
                return true;
            }
        }
        return false;
    }

    get canUnpublishSelection() {
        for (const m of this.selectionList.availableModels) {
            if (['published', 'sent'].includes(m.status)) {
                return true;
            }
        }
        return false;
    }
}
