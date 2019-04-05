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


if (!module.parent) {
    (async () => {
        const transport = await transportHidNode.default.open("");
        let pub = await transport.exchange(Buffer.from("8003000000", 'hex'));
        console.log("GOT LEDGER PUBLIC ADDR", address.encode(pub));
    })().catch(e => {
        if (e instanceof transportHidNodeErrors.TransportError) {
            console.error("ERROR", e.message);
        } else {
            console.error("ERROR", e);
        }
    });
}