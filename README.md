# koa-sso-auth-sys

单点登录服务端package。可以轻松构建一个单点登录验证服务器，可以自由扩展服务器端路由与koa中间件。该package只提供单点登录最基本的验证以及获取token的API。

# Example

## 0. build

```
npm install koa-sso-auth-sys
npm install koa-sso-auth-cli

```

## 1. run a server

```javascript

const path = require('path');
const ksas = require('koa-sso-auth-sys')({
    port: 8888,
    publicRoot: path.join(__dirname, 'public'),
    viewsConfig: { root: path.join(__dirname, 'views') },

    loginFn: function(context, data) {
        if (data.username == 'boyce' &&
            data.password == '123' &&
            data.validcode &&
            data.validcode.trim()) {
            return { status: true };
        } else {
            return { status: false, message: '登录信息不对!' }
        }
    }
});
ksas.listen();
```

## 2. run a client

```javascript

const app = koa();
app.use(require('koa-sso-auth-cli')({
        sso_server: 'http://localhost:8888',
        sso_client: 'http://localhost:8887'
    }, app));
app.listen(8887);
```

## 3. run another client

```javascript

const app = koa();
app.use(require('koa-sso-auth-cli')({
        sso_server: 'http://localhost:8888',
        sso_client: 'http://localhost:8886'
    }, app));
app.listen(8886);

```

## 4. add middleware and router to server
```javascript
const ksas = require('koa-sso-auth-sys')();
ksas.use(function *(next) {
    console.log('---------');
    yield next;
    console.log('---------');
})
ksas.get('/user/register', function *() {
    yield this.render('register.html');
});
ksas.listen();

```

