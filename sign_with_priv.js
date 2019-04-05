#!/usr/bin / env node
/* global module */
'use strict';
const algosdk = require("algosdk");
const fs = require('fs');
const address = require('algosdk/src/encoding/address');
const encoding = require("algosdk/src/encoding/encoding");
const nacl = require('algosdk/src/nacl/naclWrappers');
const base32 = require('hi-base32');
const common = require('./common');
const txnBuilder = require('algosdk/src/transaction');


async function sign(priv, transaction) {
    let keys = nacl.keyPairFromSeed(priv);
    let addr = address.encode(keys.publicKey);
    console.error("Public address:", addr);
    return common.signTX(addr, transaction, (origTx) => {
        let txn = Object.assign({}, origTx);
        if (!("note" in txn)) {
            txn["note"] = "";
        }
        txn["note"] = new Uint8Array(Buffer.from(txn["note"]));
        let algoTxn = new txnBuilder.Transaction(txn);
        const encodedMsg = encoding.encode(algoTxn.get_obj_for_encoding());
        const toBeSigned = Buffer.from(Buffer.concat([algoTxn.tag, encodedMsg]));
        const sig = nacl.sign(toBeSigned, keys.secretKey);
        return base32.encode(Buffer.from(sig));
    });
}

if (!module.parent) {
    if (process.argv.length !== 3) {
        console.error("Usage " + process.argv[0] + " priv_file");
    }
    var content = [];
    process.stdin.resume();
    process.stdin.on('data', function (buf) {
        content.push(buf);
    });
    process.stdin.on('end', function () {
        const txData = Buffer.concat(content);
        var priv = fs.readFileSync(process.argv[2]);
        (async () => {
            let signed = await sign(priv, JSON.parse(txData));
            console.log(JSON.stringify(signed, null, 4));
        })().catch(e => {
            console.error("ERROR", e);
        });
    });
}