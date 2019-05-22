#!/usr/bin / env node
/* global module */
'use strict';
const algosdk = require("algosdk");
const fs = require('fs');
const encoding = require("algosdk/src/encoding/encoding");
const common = require('./common');


async function send(transaction, atoken, aserver, aport) {
    const sTxn = common.getStxn(transaction);
    const rawOutput = new Uint8Array(encoding.encode(sTxn));
    const algodclient = new algosdk.Algod(atoken, aserver, aport);
    return await algodclient.sendRawTransaction(rawOutput);
}

function _sendIt(txData, atoken, aserver, aport) {
    (async () => {
        const transaction = JSON.parse(txData);
        let txId = await send(transaction, atoken, aserver, aport);
        console.log("TXID", txId);
    })().catch(e => {
        console.error("ERROR", e);
    });
}
if (!module.parent) {
    if (process.argv.length < 4 || process.argv.length > 5) {
        console.error("Usage " + process.argv[0] + " token server_ip server_port [tx_input_file]");
        process.exit();
    }
    var cnt = 2;
    const atoken = process.argv[cnt++];
    const aserver = process.argv[cnt++];
    const aport = process.argv[cnt++];
    if (process.argv.length === 6) {
        // read from file
        _sendIt(fs.readFileSync(process.argv[cnt++]), atoken, aserver, aport);
    } else {
        // read from stdin
        var content = [];
        process.stdin.resume();
        process.stdin.on('data', function (buf) {
            content.push(buf);
        });
        process.stdin.on('end', function () {
            _sendIt(Buffer.concat(content), atoken, aserver, aport);
        });
    }
}
