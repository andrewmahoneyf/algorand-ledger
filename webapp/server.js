const proxy = require('middleware-proxy');
const budo = require('budo');
require('dotenv').config();

if (!("ALGORAND_SERVER" in process.env)) {
    console.error("SET THE ENVIRONMENT VARIALBE ALGORAND_SERVER TO SERVER URL");
    process.exit();
}
// WE need a proxy to test the algorand server (that don't use ssl).
// and we need ssl to access usb devices.
const proxyDest = process.env["ALGORAND_SERVER"] + '/v1';
console.log("PROXY FROM /v1 to " + proxyDest);
budo('index.js', {
    browserify: {
        debug: true
    },
    host: '0.0.0.0',
    live: true,
    ssl: true,
    cors: true,
    open: false,
    portfind: true,
    pushstate: true,
    serve: 'bundle.js',
    stream: process.stdout,
    middleware: [proxy('/v1', proxyDest)]
}).on('connect', function (ev) {
    console.log('Server running on %s', ev.uri);
}).on('update', function (buffer) {
    console.log('bundle - %d bytes', buffer.length);
});
