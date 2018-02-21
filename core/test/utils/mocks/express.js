'use strict';

const _ = require('lodash');
const http = require('http');

module.exports = {
    invoke: function (app, reqParams) {
        let req = new http.IncomingMessage();
        let res = new http.ServerResponse({
            method: reqParams.method
        });

        res.end = function () {
            this.emit('finish');
        };

        req.connection = {
            encrypted: reqParams.secure
        };

        req.method = 'GET';
        req.url = reqParams.url;
        req.headers = {
            host: reqParams.host
        };

        res.connection = {
            _httpMessage: res,
            writable: true,
            destroyed: false,
            cork: function () {},
            uncork: function () {},
            write: function () {}
        };

        return new Promise(function (resolve) {
            const onFinish = (() => {
                resolve({
                    err: res.req.err,
                    statusCode: res.statusCode,
                    headers: res._headers,
                    template: res._template,
                    req: req,
                    res: res
                });
            });

            res.once('finish', onFinish);
            app(req, res);
        });
    }
};
