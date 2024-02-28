const HttpContext = require('@tryghost/http-context/build/HttpContext').default;

module.exports = function initHttpContext(req, res, next) {
    // Initialize the http context for the current request
    HttpContext.start(() => {
        // End the http context at the end of the response lifecycle
        res.on('finish', () => HttpContext.end());
        req.on('close', () => HttpContext.end());

        // End the http context early if the request is aborted
        if (req.readableAborted) {
            HttpContext.end();

            return;
        }

        next();
    });
};
