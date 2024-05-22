import RSVP from 'rsvp';
import Service from '@ember/service';
import {action} from '@ember/object';
import {isBlank, isEmpty} from '@ember/utils';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class SearchService extends Service {
    @service ajax;
    @service notifications;
    @service store;

    content = [];
    isContentStale = true;

    searchables = [
        {
            name: 'Staff',
            model: 'user',
            fields: ['id', 'slug', 'url', 'name'], // id not used but required for API to have correct url
            idField: 'slug',
            titleField: 'name'
        },
        {
            name: 'Tags',
            model: 'tag',
            fields: ['slug', 'url', 'name'],
            idField: 'slug',
            titleField: 'name'
        },
        {
            name: 'Posts',
            model: 'post',
            fields: ['id', 'url', 'title', 'status', 'published_at', 'visibility'],
            idField: 'id',
            titleField: 'title'
        },
        {
            name: 'Pages',
            model: 'page',
            fields: ['id', 'url', 'title', 'status', 'published_at', 'visibility'],
            idField: 'id',
            titleField: 'title'
        }
    ];

    @action
    expireContent() {
        this.isContentStale = true;
    }

    @task({restartable: true})
    *searchTask(term) {
        if (isBlank(term)) {
            return [];
        }

        // start loading immediately in the background
        this.refreshContentTask.perform();

        // debounce searches to 200ms to avoid thrashing CPU
        yield timeout(200);

        // wait for any on-going refresh to finish
        if (this.refreshContentTask.isRunning) {
            yield this.refreshContentTask.lastRunning;
        }

        const searchResult = this._searchContent(term);

        return searchResult;
    }

    _searchContent(term) {
        const normalizedTerm = term.toString().toLowerCase();
        const results = [];

        this.searchables.forEach((searchable) => {
            const matchedContent = this.content.filter((item) => {
                const normalizedTitle = item.title.toString().toLowerCase();
                return (
                    item.groupName === searchable.name &&
                    normalizedTitle.indexOf(normalizedTerm) >= 0
                );
            });

            if (!isEmpty(matchedContent)) {
                results.push({
                    groupName: searchable.name,
                    options: matchedContent
                });
            }
        });

        return results;
    }

    @task({drop: true})
    *refreshContentTask({forceRefresh = false} = {}) {
        if (!forceRefresh && !this.isContentStale) {
            return true;
        }

        this.isContentStale = true;

        const content = [];
        const promises = this.searchables.map(searchable => this._loadSearchable(searchable, content));

        try {
            yield RSVP.all(promises);
            this.content = content;
        } catch (error) {
            // eslint-disable-next-line
            console.error(error);
        }

        this.isContentStale = false;
    }

    async _loadSearchable(searchable, content) {
        const url = `${this.store.adapterFor(searchable.model).urlForQuery({}, searchable.model)}/`;
        const maxSearchableLimit = '10000';
        const query = {fields: searchable.fields, limit: maxSearchableLimit};

        try {
            const response = await this.ajax.request(url, {data: query});

            const items = response[pluralize(searchable.model)].map(
                item => ({
                    id: `${searchable.model}.${item[searchable.idField]}`,
                    url: item.url,
                    title: item[searchable.titleField],
                    groupName: searchable.name,
                    status: item.status,
                    visibility: item.visibility,
                    publishedAt: item.published_at
                })
            );

            content.push(...items);
        } catch (error) {
            console.error(error); // eslint-disable-line

            this.notifications.showAPIError(error, {
                key: `search.load${searchable.name}.error`
            });
        }
    }
}
