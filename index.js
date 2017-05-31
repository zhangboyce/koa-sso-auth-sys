'use strict';

const path = require('path');
const koa = require('koa');
const koaStatic = require('koa-static');
const koaSwig = require('koa-swig');
const logger = require('koa-logger');
const session = require('koa-generic-session');
const redisStore = require('koa-redis');
const KoaRouter = require('koa-router')();
const methods = require('methods');
const config = require('./src/config');

module.exports = Ksas;

function Ksas(options) {
    if (!(this instanceof Ksas)) {
        return new Ksas(options);
    }
    options = options || {};

    this.redis = options.redis || { "host":"127.0.0.1", "port":6379 };
    this.viewsConfig = Object.assign({
        root: path.join(__dirname, "views"),
        autoescape: true,
        ext: 'html'
    }, options.viewsConfig || {});
    this.publicRoot = options.publicRoot || path.join(__dirname, 'public');

    this.keys = options.keys || ['koa-sso-auth-sys-2016','keys'];
    this.port = options.port || 8888;
    this.loginFn = options.loginFn ||
        function (context, data) {
            if (data.username && data.password) {
                return { status: true };
            }
        };
    this.router = KoaRouter;
    this.app = koa();

    // these routers cannot be overwrite
    require('./src/routers')(this.router, this.loginFn);

    // set global config
    config.put('redis', this.redis);
    config.put('loginPage', options.loginPage || 'login');
    config.put('welcomePage', options.welcomePage || 'welcome')
}

Ksas.prototype.use = function(fn) {
    this.app.use(fn);
};

Ksas.prototype.listen = function() {
    this.app.use(function *(next) {
        try {
            yield next;
            if (parseInt(this.status) === 404) {
                yield this.render('404');
            }
        }catch(e) {
            console.error(e);
            this.body = e.stack;
            this.status = 500;
        }
    });

    this.app.use(koaStatic(this.publicRoot));
    this.app.context.render = koaSwig(this.viewsConfig);
    this.app.keys = this.keys;
    this.app.use(session({
        store: redisStore(this.redis)
    }));

    this.app.use(this.router.routes()).use(this.router.allowedMethods());

    // these routers can be overwrite
    this.get('/welcome', function *() {
        yield this.render(config.get('welcomePage'));
    });

    this.app.listen(this.port);
    console.log('koa-sso-auth-sys listening on port ' + this.port);
};

methods.forEach(function (method) {
    Ksas.prototype[method] = function (name, path, middleware) {
        if (typeof path === 'string' || path instanceof RegExp) {
            this.router[method](name, path, middleware);
        } else {
            middleware = path;
            path = name;
            this.router[method](path, middleware);
        }
    }
});
Ksas.prototype.del = Ksas.prototype['delete'];