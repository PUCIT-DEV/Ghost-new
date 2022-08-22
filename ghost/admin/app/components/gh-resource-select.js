import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhResourceSelect extends Component {
    @service store;

    @tracked _options = [];

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    constructor() {
        super(...arguments);
        this.fetchOptionsTask.perform();
    }

    get options() {
        return this._options;
    }


    get flatOptions() {
        const options = [];

        function getOptions(option) {
            if (option.options) {
                return option.options.forEach(getOptions);
            }

            options.push(option);
        }

        this._options.forEach(getOptions);

        return options;
    }

    get selectedOptions() {
        console.log(this.args.resources);
        const resources = this.args.resources || [];
        return this.flatOptions.filter(option => resources.find(resource => resource.id === option.id));
    }

    @action
    onChange(options) {
        console.log(options);
        this.args.onChange(options);
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];

        const posts = yield this.store.query('post', {filter: 'status:published', limit: 'all'});
        const pages = yield this.store.query('page', {filter: 'status:published', limit: 'all'});

        function mapResource(resource) {
            return {
                name: resource.title,
                id: resource.id
            };
        }

        if (posts.length > 0) {
            options.push({
                groupName: 'Posts',
                options: posts.map(mapResource)
            });
        }

        if (pages.length > 0) {
            options.push({
                groupName: 'Pages',
                options: pages.map(mapResource)
            });
        }

        console.log(options);

        this._options = options;
    }
}
