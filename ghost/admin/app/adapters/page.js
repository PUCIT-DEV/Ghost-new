import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class Page extends ApplicationAdapter {
    // posts and pages now include everything by default
    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        return this.buildURL(modelName, id, snapshot, requestType, query);
    }

    buildQuery(store, modelName, options) {
        if (!options.formats) {
            options.formats = 'mobiledoc,lexical';
        }

        return options;
    }
}
