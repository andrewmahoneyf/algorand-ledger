#!/usr/bin / env node
/* global module */
'use strict';
const algosdk = require("algosdk");
const nacl = require('algosdk/src/nacl/naclWrappers');
const address = require('algosdk/src/encoding/address');
const fs = require('fs');
const common = require('./common');


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
        from =
                msig = {msig: {
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
            genesisID: common.GENESIS_ID
        },
        ...msig
    };
}

if (!module.parent) {
    if (process.argv.length < 5) {
        console.log("Usage: version threshold pks...\n");
        process.exit();
    }
    const pks = process.argv.slice(4, process.argv.length);
    console.log("PKS", pks);
    console.log("MULTISIG ADDR", common.get_multisig_addr(pks, process.argv[3], process.argv[4]));
}