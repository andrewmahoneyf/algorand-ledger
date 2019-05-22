const algosdk = require("algosdk");
const fs = require('fs');
const txnBuilder = require('algosdk/src/transaction');
const encoding = require("algosdk/src/encoding/encoding");
const msgpack = require("msgpack-lite");

function print(obj, stack) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (Buffer.isBuffer(obj[property])) {
                console.log(stack + "  " + property
                        + " " + obj[property].map(x => (x >= 32 && x <= 127 ? x : '.'))
                        + " == 0x" + obj[property].toString('hex').toUpperCase()
                        );

            } else if (typeof obj[property] === "object") {
                console.log(property);
                print(obj[property], stack + "    ");
            } else {
                console.log(stack + "  " + property + " " + obj[property]);
            }
        }
    }
}

const fileName = process.argv[2];
console.log(fileName);
const d = fs.readFileSync(fileName);
const de = msgpack.decode(d);
var encodeStream = msgpack.createDecodeStream();
encodeStream.on("data", (decoded) => {
    print(decoded, '')
    console.log(JSON.stringify(decoded));
});
encodeStream.write(d);
encodeStream.end();
