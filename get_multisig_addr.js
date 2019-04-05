#!/usr/bin/env node
/* global module */
'use strict';
const common = require('./common');

function usage() {
    console.error("Usage: version threshold pks...\n");
    process.exit();
}

if (!module.parent) {
    if (process.argv.length < 5) {
        usage();
    }
    const version = parseInt(process.argv[2]);
    const threshold = parseInt(process.argv[3]);
    if (isNaN(version) || isNaN(threshold)) {
        usage();
    }
    const pks = process.argv.slice(4, process.argv.length);
    if (threshold > pks.length) {
        console.error("Threshold must be less or equal to pks quantity\n");
        process.exit();
    }
    console.log("Version", version);
    console.log("Threshold", threshold);
    console.log("PKS", pks);
    console.log("MULTISIG ADDR", common.get_multisig_addr(pks, version, threshold));
}