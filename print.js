const algosdk = require("algosdk");
const fs = require('fs');
const txnBuilder = require('algosdk/src/transaction');
const encoding = require("algosdk/src/encoding/encoding");
const address = require('algosdk/src/encoding/address');
const msgpack = require("msgpack-lite");


function printAddr(buf) {
    return address.encode(buf) + " == 0x" + buf.toString('hex').toUpperCase();
}

function print(obj, isAlgorand, stack) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (isAlgorand === true) {
                if (property == "amt") {
                    console.log(stack, "Amount:", obj[property]);
                } else if (property == "fee") {
                    console.log(stack, "Fee", obj[property]);
                } else if (property == "fv") {
                    console.log(stack, "First Block:", obj[property]);
                } else if (property == "lv") {
                    console.log(stack, "Last block:", obj[property]);
                } else if (property == "type") {
                    console.log(stack, "Transaction type:", obj[property]);
                } else if (property == "gen") {
                    console.log(stack, "Genesis block:", obj[property]);
                } else if (property == "rcv" && Buffer.isBuffer(obj[property])) {
                    console.log(stack, "Receiver Address:", printAddr(obj[property]));
                } else if (property == "snd" && Buffer.isBuffer(obj[property])) {
                    console.log(stack, "Sender Address:", printAddr(obj[property]));
                } else if (property == "subsig") {
                    console.log(stack, "Signatures");
                    for (const cnt in obj[property]) {
                        const pkObj = obj[property][cnt]
                        for (const pkk in pkObj) {
                            if (pkk === "pk") {
                                console.log(stack, "     ", parseInt(cnt) + 1, " Sender Public Key:", printAddr(pkObj[pkk]));
                            } else if (pkk === "s") {
                                console.log(stack, "           ", parseInt(cnt) + 1, " Signed:", pkObj[pkk].toString('hex').toUpperCase());
                            } else {
                                console.log(stack, "           ", "UNKNOWN:", pkkj);
                            }
                        }
                    }
                } else if (property == "thr") {
                    console.log(stack, "Multisig Threshold", obj[property]);
                } else if (property == "note") {
                    console.log(stack, "Note", obj[property].toString());
                } else if (property == "v") {
                    console.log(stack, "Multisig Version", obj[property]);
                } else if (property == "pk" && Buffer.isBuffer(obj[property])) {
                    console.log(stack, "Sender Public Key:", printAddr(obj[property]));
                } else {
                    console.log(stack, "UNKNOWN", property);
                }
                continue;
            }


            if (property == "txn") {
                console.log("Algorand transaction");
                print(obj[property], true, stack + "    ");
                console.log("-".repeat(80));
            } else if (property == "msig") {
                console.log("Algorand multisig");
                print(obj[property], true, stack + "    ");
            } else if (Buffer.isBuffer(obj[property])) {
                console.log(stack + "  " + property
                    + " " + obj[property].map(x => (x >= 32 && x <= 127 ? x : '.'))
                    + " == 0x" + obj[property].toString('hex').toUpperCase()
                );
            } else if (typeof obj[property] === "object") {
                console.log(property);
                print(obj[property], false, stack + "    ");
            } else {
                console.log(stack + "  " + property + " " + obj[property]);
            }
        }
    }
}


if (process.argv.length != 3) {
    console.log("USAGE ", process.argv[1], " filename");
    process.exit(1);
}
const fileName = process.argv[2];
const d = fs.readFileSync(fileName);
var encodeStream = msgpack.createDecodeStream();
encodeStream.on("data", (decoded) => {
    print(decoded, false, '')
});
encodeStream.write(d);
encodeStream.end();
