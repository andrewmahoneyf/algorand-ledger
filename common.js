#!/usr/bin / env node
/* global module */
'use strict';
const algosdk = require("algosdk");
const nacl = require('algosdk/src/nacl/naclWrappers');
const address = require('algosdk/src/encoding/address');
const base32 = require('hi-base32');
const BN = require('bn.js');
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


function _paddedBuf(str, size) {
    var ret = Buffer.alloc(size, 0);
    if (str) {
        if (str.length > size) {
            throw new Error("String too long " + str.length + " > " + size);
        }
        ret.write(str, 0);
    }
    return ret;
}

async function ledger_exchange(transport, val) {
    try {
        const data = await transport.exchange(val);
        if (data.length < 2) {
            throw new Error("Invalid response " + data);
        }
        const stStr = data.slice(data.length - 2, data.length);
        const status = stStr.readUInt16LE();
        if (status !== 0x90) {
            throw new Error("Invalid response status " + stStr.toString('hex') + " " + status);
        }
        return data.slice(0, data.length - 2);
    } catch (err) {
        console.error("Error", err);
        throw new Error("Error connection to device" + err);
    }
}

async function ledger_get_pub_addr(transport) {
    const addr = await ledger_exchange(transport, Buffer.from("8003000000", 'hex'));
    return address.encode(addr);
}

async function ledger_sign(transport, txn) {
    var msg = [];
    msg.push(Buffer.from([0x80]));
    const txType = txn['type'];
    if (txType === 'pay') {
        msg.push(Buffer.from([1]));
    } else if (txType === 'keyreg') {
        msg.push(Buffer.from([2]));
    } else {
        throw new Error("Unknown transaction type " + txType);
    }
    msg.push(Buffer.from(Buffer.from(address.decode(txn["from"]).publicKey)));
    //apdu += struct.pack("32s", intx.get('snd', ""))
    // littel-indian, 8 bytes
    msg.push(new BN(txn['fee']).toBuffer('le', 8));
    msg.push(new BN(txn['firstRound']).toBuffer('le', 8));
    msg.push(new BN(txn['lastRound']).toBuffer('le', 8));
    msg.push(_paddedBuf(txn['genesisID'], 32));
    if (txType === 'pay') {
        msg.push(Buffer.from(address.decode(txn["to"]).publicKey));
        msg.push(new BN(txn['amount']).toBuffer('le', 8));
        // When CloseRemainderTo is set, it indicates that the
        // transaction is requesting that the account should be
        // closed, and all remaining funds be transferred to this
        // address.
        msg.push(_paddedBuf(txn["close"], 32));
    } else if (txType === 'keyreg') {
        msg.push(_paddedBuf(txn["votekey"], 32));
        msg.push(_paddedBuf(txn["selkey"], 32));
    } else {
        throw new Error("Unknown transaction type " + txType);
    }
    const toSign = Buffer.concat(msg);
    const signature = await ledger_exchange(transport, toSign);
    return base32.encode(signature);
}



function prepare_transaction(to, amount, fee, firstBlock, publicKeys, lastBlock, note) {
    var from;
    var msig = {};
    if (typeof publicKeys === "object"
        && "pks" in publicKeys
        && "version" in publicKeys
        && "threshold" in publicKeys
        && Array.isArray(publicKeys["pks"])
        && publicKeys["pks"].length > 1) {
        const version = parseInt(publicKeys["version"]);
        const threshold = parseInt(publicKeys["threshold"]);
        try {
            from = get_multisig_addr(publicKeys["pks"], version, threshold);
        } catch (e) {
            console.error("Error generating multisig address", e);
            from = "multisig addr";
        }
        msig = {
            msig: {
                subsig: publicKeys["pks"].map(a => ({pk: a})),
                threshold: threshold,
                version: version
            }
        };
    } else {
        if (Array.isArray(publicKeys)) {
            if (publicKeys.length === 1) {
                from = publicKeys[0];
            }
        } else {
            from = publicKeys;
        }
    }
    if (!from) {
        throw new Error("invalid publicKey");
    }
    return {
        txn: {
            type: 'pay',
            from: from,
            to: to,
            fee: fee,
            amount: amount,
            firstRound: firstBlock,
            lastRound: lastBlock ? lastBlock : firstBlock + 1000,
            note: note,
            genesisID: GENESIS_ID
        },
        ...msig
    };
}

function getStxn(transaction) {
    console.error("Transaction", transaction);
    const txn = transaction['txn'];
    if (!("note" in txn) || !txn["note"]) {
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
        && transaction['msig']['subsig'].length > 1) {
        let msig = transaction['msig'];
        let subsig = msig['subsig'];
        const fromAddr = get_multisig_addr(subsig.map(k => (k['pk'])), msig["version"], msig["threshold"]);
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


module.exports = {
    get_multisig_addr,
    getPublic,
    signTX,
    GENESIS_ID,
    ledger_sign,
    ledger_get_pub_addr,
    ledger_exchange
};
