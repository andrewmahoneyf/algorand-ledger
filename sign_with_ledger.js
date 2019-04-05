#!/usr/bin / env node
/* global module */
'use strict';
require("babel-polyfill");
const transportHidNode = require("@ledgerhq/hw-transport-node-hid");
const transportHidNodeErrors = require("@ledgerhq/errors");
const algosdk = require("algosdk");
const fs = require('fs');
const address = require('algosdk/src/encoding/address');
const base32 = require('hi-base32');
const BN = require('bn.js');
const common = require('./common');

function paddedBuf(str, size) {
    var ret = Buffer.alloc(size, 0);
    if (str) {
        if (str.length > size) {
            throw new Error("String too long " + str.length + " > " + size);
        }
        ret.write(str, 0);
    }
    return ret;
}

async function exchange(transport, val) {
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

async function get_pub_addr(transport) {
    const addr = await exchange(transport, Buffer.from("8003000000", 'hex'));
    return  address.encode(addr);
}

async function _sign(transport, txn) {
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
    msg.push(paddedBuf(txn['genesisID'], 32));
    if (txType === 'pay') {
        msg.push(Buffer.from(address.decode(txn["to"]).publicKey));
        msg.push(new BN(txn['amount']).toBuffer('le', 8));
        // When CloseRemainderTo is set, it indicates that the
        // transaction is requesting that the account should be
        // closed, and all remaining funds be transferred to this
        // address.
        msg.push(paddedBuf(txn["close"], 32));
    } else if (txType === 'keyreg') {
        msg.push(paddedBuf(txn["votekey"], 32));
        msg.push(paddedBuf(txn["selkey"], 32));
    } else {
        throw new Error("Unknown transaction type " + txType);
    }
    const toSign = Buffer.concat(msg);
    const signature = await exchange(transport, toSign);
    return base32.encode(signature);
}

async function sign(transport, transaction) {
    let addr = await get_pub_addr(transport);
    console.error("Ledger address:", addr);
    return common.signTX(addr, transaction, (txn) => {
        return _sign(transport, txn);
    });
}

if (!module.parent) {
    (async () => {
        let fName = process.stdin.fd;
        if (process.argv.length === 3) {
            // read from file
            fName = process.argv[2];
        }
        const txData = fs.readFileSync(fName);
        const transport = await transportHidNode.default.open("");
        transport.setDebugMode((msg) => {
            console.error(msg);
        });
        //let pub = await get_pub_addr(transport);
        //console.log("GOT LEDGER PUBLIC ADDR", pub);
        let signed = await sign(transport, JSON.parse(txData));
        console.log(JSON.stringify(signed, null, 4));
    })().catch(e => {
        if (e instanceof transportHidNodeErrors.TransportError) {
            console.error("ERROR", e.message);
        } else {
            console.error("ERROR", e);
        }
    });
}