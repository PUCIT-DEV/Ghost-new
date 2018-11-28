const {Router, static} = require('express');
const cookie = require('cookie');
const body = require('body-parser');
const jwt = require('jsonwebtoken');

module.exports = function MembersApi({createMember, validateMember}) {
    const router = Router();

    const apiRouter = Router();

    apiRouter.post('/token', (req, res) => {
        const {signedin} = cookie.parse(req.headers.cookie);
        if (!signedin) {
            res.writeHead(401);
            return res.end();
        }
        const token = jwt.sign({}, null, {algorithm: 'none'});
        return res.end(token);
    });

    apiRouter.post('/signup', body.json(), (req, res) => {
        if (!req.body) {
            res.writeHead(400);
            return res.end();
        }
        const {name, email, password} = req.body;

        if (!name || !email || !password) {
            res.writeHead(400);
            return res.end('/signup expects {name, email, password}');
        }

        createMember({name, email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch((err) => {
            res.writeHead(400);
            res.end(err.message);
        });
    });

    apiRouter.post('/signin', body.json(), (req, res) => {
        if (!req.body) {
            res.writeHead(400);
            return res.end();
        }
        const {email, password} = req.body;

        if (!email || !password) {
            res.writeHead(400);
            return res.end('/signin expects {email, password}');
        }

        validateMember({email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch((err) => {
            res.writeHead(401);
            res.end(err.message);
        });
    });

    function setCookie(member) {
        return cookie.serialize('signedin', member.id, {
            maxAge: 180,
            path: '/ghost/api/v2/members/token',
            sameSite: 'strict',
            httpOnly: true
        });
    }

    apiRouter.post('/signout', (req, res) => {
        res.writeHead(200, {
            'Set-Cookie': cookie.serialize('signedin', false, {
                maxAge: 0,
                path: '/ghost/api/v2/members/token',
                sameSite: 'strict',
                httpOnly: true
            })
        });
        res.end();
    });

    const staticRouter = Router();

    staticRouter.use(static(require('path').join(__dirname, './static')));

    router.use('/api', apiRouter);
    router.use('/static', staticRouter);

    function httpHandler(req, res, next) {
        return router.handle(req, res, next);
    }

    httpHandler.staticRouter = staticRouter;
    httpHandler.apiRouter = apiRouter;

    return httpHandler;
};
