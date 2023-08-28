const recommendations = require('../../services/recommendations');

module.exports = {
    docName: 'recommendations',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [],
        permissions: true,
        validation: {},
        async query() {
            return await recommendations.controller.listRecommendations();
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        options: [],
        validation: {},
        permissions: true,
        async query(frame) {
            return await recommendations.controller.addRecommendation(frame);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            return await recommendations.controller.editRecommendation(frame);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return recommendations.controller.deleteRecommendation(frame);
        }
    }
};
