#!/usr/bin / env node
/* global module */
'use strict';
const common = require('./common');

function prepare_key_reg_transaction(votepk, vrfpk, fee, firstBlock, publicKeys, lastBlock, note) {
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
            type: 'keyreg',
            from: from,
            fee: fee,
            firstRound: firstBlock,
            lastRound: lastBlock ? lastBlock : firstBlock + 1000,
            genesisID: common.GENESIS_ID,
            selkey: vrfpk,
            votekey: votepk
        },
        ...msig
    };
}


if (!module.parent) {
    if (process.argv.length < 6) {
        console.error("Usage: to amount fee firstblock [pks | pks... threshold] \n");
        process.exit();
    }
    var cnt = 2;
    const to = process.argv[cnt++];
    const amount = parseInt(process.argv[cnt++]);
    const fee = parseInt(process.argv[cnt++]);
    const firstBlock = parseInt(process.argv[cnt++]);
    let publicKeys;
    if (process.argv.length === 7) {
        publicKeys = common.getPublic(process.argv[cnt++]);
    } else {
        const pks = process.argv.slice(cnt++, process.argv.length - 1);
        const threshold = parseInt(process.argv[process.argv.length - 1]);
        if (threshold > pks.length) {
            console.error("Error threshold must be lower or equal to public key quantity");
            process.exit();
        }
        publicKeys = {
            pks: pks.map(common.getPublic),
            version: 1,
            threshold: threshold
        };
    }
    const txn = common.prepare_transaction(to, amount, fee, firstBlock, publicKeys);
    console.log(JSON.stringify(txn, null, 4));
}