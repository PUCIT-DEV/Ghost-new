import Component from '@glimmer/component';
import {action} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class GhSearchInputComponent extends Component {
    @service router;
    @service search;

    @action
    openSelected(selected) {
        if (!selected) {
            return;
        }

        this.args.onSelected?.(selected);

        if (selected.searchable === 'Posts') {
            let id = selected.id.replace('post.', '');
            this.router.transitionTo('lexical-editor.edit', 'post', id);
        }

        if (selected.searchable === 'Pages') {
            let id = selected.id.replace('page.', '');
            this.router.transitionTo('lexical-editor.edit', 'page', id);
        }

        if (selected.searchable === 'Users') {
            let id = selected.id.replace('user.', '');
            this.router.transitionTo('settings-x.settings-x', `staff/${id}`);
        }

        if (selected.searchable === 'Tags') {
            let id = selected.id.replace('tag.', '');
            this.router.transitionTo('tag', id);
        }
    }

    @action
    onClose(select, keyboardEvent) {
        // refocus search input after dropdown is closed (eg, by pressing Escape)
        run.later(() => {
            keyboardEvent?.target.focus();
        });
    }
}
