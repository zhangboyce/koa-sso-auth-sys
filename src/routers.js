'use strict';

const config = require('./config');
const uuid = require('node-uuid');
const crypto = require('crypto');
const parse = require('co-body');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const client = redis.createClient(config.get('redis'));

module.exports = function(router, loginFn) {

    router.get('/', function *() {
        this.redirect('user/login' + this.search);
    });

    router.get('/user/login', function *() {
        let token = this.session.token;
        let account = yield client.getAsync('token-' + token);

        if (token && account) {
            let auth_callback = this.query.auth_callback;
            if (!auth_callback) {
                yield this.render(config.get('welcomePage'));
            } else {
                let code = yield generateCode(token);
                this.redirect(auth_callback + '?code=' + code);
            }
        } else {
            client.del('token-' + token);
            this.session = null;

            yield this.render(config.get('loginPage'));
        }
    });

    router.get('/user/logout', function *() {
        let token = this.session.token;
        client.del('token-' + token);
        this.session = null;

        let auth_callback = this.query.auth_callback;
        this.redirect('/?auth_callback=' + auth_callback);
    });

    router.get('/api/code/check', function *() {
        let code = this.query.code;
        if (code) {
            let token = yield client.getAsync('code-' + code);
            if(!token) {
                this.body = { status: false, message: 'code已过期, 请重新获取' };
                return;
            }
            let account = yield client.getAsync('token-' + token);
            if (!account) {
                this.body = { status: false, message: 'token已过期, 请重新登录' };
                return;
            }
            this.body = { status: true, result: token };

        } else {
            this.body = { status: false, message: '没有找到code' };
        }
    });

    router.get('/api/token/check', function *() {
        let token = this.query.token;
        if (!token) {
            this.body = { status: false, message: '没有找到token' };
            return;
        }
        let account = yield client.getAsync('token-' + token);
        if(!account) {
            this.body = { status: false, message: 'token已过期, 请重新登录' };
            return;
        }
        this.body = { status: true };
    });

    router.post('/api/user/login', function *() {
        let token = this.session.token;
        let account = yield client.getAsync('token-' + token);
        let data = yield parse(this);

        // had login
        if (token && account) {
            let code = yield generateCode(token);
            this.body = { status: true, result: code };
        } else {
            let loginResult = loginFn(this, data);
            if (loginResult.status === true) {
                client.del('token-' + token);
                token = yield generateToken(account);
                let code = yield generateCode(token);
                this.session.token = token;

                this.body = { status: true, result: code };
            } else {
                this.body = { status: false, message: loginResult.message };
            }
        }
    });

    function * generateCode(token) {
        let code = random();
        yield client.setAsync('code-' + code, token);
        yield client.expireAsync('code-' + code, 5);
        return code;
    }

    function * generateToken(account) {
        let token = random();
        yield client.setAsync('token-' + token, JSON.stringify(account));
        return token;
    }

    function random() {
        var uid = uuid.v1();
        var md5 = crypto.createHash('md5');
        md5.update(uid);
        return md5.digest('hex');
    }
};