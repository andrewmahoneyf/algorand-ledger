#!/usr/bin / env node
/* global module */
'use strict';
require("babel-polyfill");
const transportHidNode = require("@ledgerhq/hw-transport-node-hid");
const transportHidNodeErrors = require("@ledgerhq/errors");
const fs = require('fs');
const common = require('./common');


async function sign(transport, transaction) {
    let addr = await common.ledger_get_pub_addr(transport);
    console.error("Ledger address:", addr);
    return common.signTX(addr, transaction, (txn) => {
        return common.ledger_sign(transport, txn);
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