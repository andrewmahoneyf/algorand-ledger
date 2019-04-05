#!/usr/bin / env node
/* global module */
'use strict';
const algosdk = require("algosdk");
const fs = require('fs');

const txnBuilder = require('algosdk/src/transaction');
const encoding = require("algosdk/src/encoding/encoding");
const address = require('algosdk/src/encoding/address');
const nacl = require('algosdk/src/nacl/naclWrappers');
const client = require('algosdk/src/client/client');
const base32 = require('hi-base32');
const common = require('./common');


function _getStxn(transaction) {
    console.error("Transaction", transaction);
    const txn = transaction['txn'];
    if (!("note" in txn)) {
        txn["note"] = "";
    }
    txn["note"] = new Uint8Array(Buffer.from(txn["note"]));
    const algoTxn = new txnBuilder.Transaction(txn);
    const encodedAlgoTxn = algoTxn.get_obj_for_encoding();
    const encodedMsg = encoding.encode(encodedAlgoTxn);
    const toBeSigned = Buffer.concat([algoTxn.tag, encodedMsg]);

    if ("sig" in transaction) {
        let sig = base32.decode.asBytes(transaction['sig']);
        return {
            "sig": Buffer.from(sig),
            "txn": encodedAlgoTxn
        };
    } else if ("msig" in transaction
            && typeof transaction['msig'] === "object"
            && "subsig" in transaction['msig']
            && Array.isArray(transaction['msig']['subsig'])
            && transaction['msig']['subsig'].length > 1)
    {
        let msig = transaction['msig'];
        let subsig = msig['subsig'];
        const fromAddr = common.get_multisig_addr(subsig.map(k => (k['pk'])), msig["version"], msig["threshold"]);
        if (txn["from"] !== fromAddr) {
            throw new Error("from address must match multsig address " + fromAddr);
        }
        return {
            "msig": {
                subsig: subsig.map(k => {
                    let ret = {pk: Buffer.from(address.decode(k['pk']).publicKey)};
                    if (k['sig']) {
                        ret['s'] = Buffer.from(base32.decode.asBytes(k['sig']));
                    }
                    return ret;
                }),
                thr: msig["threshold"],
                v: msig["version"]
            },
            "txn": encodedAlgoTxn
        };
    }
    throw new Error("Invalid signature in transaction");
}

async function send(transaction, atoken, aserver, aport) {
    const sTxn = _getStxn(transaction);
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
