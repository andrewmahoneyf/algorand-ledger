#!/usr/bin / env node
/* global module */
'use strict';
const algosdk = require("algosdk");
const nacl = require('algosdk/src/nacl/naclWrappers');
const address = require('algosdk/src/encoding/address');
const fs = require('fs');
const  GENESIS_ID = "testnet-v31.0";


function get_multisig_addr(pks, version, threshold) {
    var r = [];
    r.push(Buffer.from("MultisigAddr"));
    r.push(Buffer.from([version]));
    r.push(Buffer.from([threshold]));
    for (let k of pks) {
        r.push(Buffer.from(address.decode(k).publicKey));
    }
    let bigBuf = Buffer.concat(r);
    return address.encode(nacl.genericHash(bigBuf));
}


function getPublic(fileOrPk) {
    let pub = fileOrPk;
    try {
        const stat = fs.statSync(fileOrPk);
        if (stat.isFile()) {
            pub = fs.readFileSync(fileOrPk, 'ascii');
            pub = pub.slice(0, pub.length - 1);
        }
    } catch (err) {
    }
    if (!address.isValidAddress(pub)) {
        throw new Error("Invalid address " + pub);
    }
    return pub;
}

function _validateTX(transaction) {
    console.error("Transaction:", JSON.stringify(transaction, null, 4));
    if (typeof transaction !== "object") {
        throw new Error("Invalid transaction data");
    }
    if (!('txn' in transaction)) {
        throw new Error("Invalid transaction data, transaction missing");
    }
    return transaction['txn'];
}

function _isMultiSig(transaction) {
    return ("msig" in transaction
            && typeof transaction['msig'] === "object"
            && "subsig" in transaction['msig']
            && Array.isArray(transaction['msig']['subsig'])
            && transaction['msig']['subsig'].length > 1);
}

async function signTX(addr, transaction, _sign) {
    _validateTX(transaction);
    const txn = transaction['txn'];
    let ret;
    if (_isMultiSig(transaction)) {
        let msig = transaction['msig'];
        let subsig = msig['subsig'];
        const fromAddr = get_multisig_addr(subsig.map(k => (k['pk'])), msig["version"], msig["threshold"]);
        if (txn["from"] === fromAddr) {
            for (let i = 0; i < subsig.length; i++) {
                if (typeof subsig[i] === "object" && "pk" in subsig[i] && subsig[i]['pk'] === addr) {
                    // multisig.
                    subsig[i].sig = await _sign(txn);
                    ret = {
                        msig: {
                            subsig: subsig,
                            ...transaction["msig"]
                        },
                        txn: txn
                    };
                }
            }
        }
    } else {
        if (txn["from"] === addr) {
            ret = {
                sig: await _sign(txn),
                txn: txn
            };
        }
    }
    if (!ret) {
        throw new Error("Transaction must match address " + addr);
    }
    return ret;
}

module.exports = {
    get_multisig_addr,
    getPublic,
    signTX,
    GENESIS_ID
};
