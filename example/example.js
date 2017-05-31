const path = require('path');

let ksas = require('./../index')({
    port: 8887,
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