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
        from = common.get_multisig_addr(publicKeys["pks"], version, threshold);
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
            lastRound: lastBlock ? lastBlock : firstBlock + 100,
            note: note,
            genesisID: common.GENESIS_ID
        },
        ...msig
    };
}

if (!module.parent) {
    if (process.argv.length < 6) {
        console.log("Usage: to amount fee firstblock [pks | pks...]\n");
        process.exit();
    }
    var cnt = 2;
    const to = process.argv[cnt++];
    const amount = parseInt(process.argv[cnt++]);
    const fee = parseInt(process.argv[cnt++]);
    const firstBlock = parseInt(process.argv[cnt++]);
    const pks = process.argv.slice(cnt++);
    var publicKeys;
    if (pks.length === 1) {
        publicKeys = common.getPublic(pks[0]);
    } else {
        publicKeys = {
            pks: pks.map(common.getPublic),
            version: 1,
            threshold: pks.length - 1
        };
    }
    const txn = prepare_transaction(to, amount, fee, firstBlock, publicKeys);
    console.log(JSON.stringify(txn, null, 4));
}