#!/usr/bin/env node
/* global module */
'use strict';
require("babel-polyfill");
const transportHidNode = require("@ledgerhq/hw-transport-node-hid");
const transportHidNodeErrors = require("@ledgerhq/errors");
const common = require('./common');

if (!module.parent) {
    (async () => {
        const transport = await transportHidNode.default.open("");
        let pub = await common.ledger_get_pub_addr(transport);
        console.log("GOT LEDGER PUBLIC ADDR", pub);
    })().catch(e => {
        if (e instanceof transportHidNodeErrors.TransportError) {
            console.error("ERROR", e.message);
        } else {
            console.error("ERROR", e);
        }
    });
}