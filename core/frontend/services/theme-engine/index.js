module.exports = {
    loadCoreHelpers: require('./handlebars/helpers').loadCoreHelpers,
    getActive: require('./active').get,
    middleware: require('./middleware')
};
