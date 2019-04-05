const algosdk = require("algosdk");
const encoding = require("algosdk/src/encoding/encoding");
const client = require('algosdk/src/client/client');

if (process.argv.length < 5 || process.argv.length > 7) {
    console.error("USAGE atokne aserver aport [blockNum]");
    process.exit();
}
function noteb64ToNote(o) {
    if (o.noteb64 !== undefined) {
        o.note = Buffer.from(o.noteb64, "base64");
    }
    return o;
}

const atoken = process.argv[2];
const aserver = process.argv[3];
const aport = process.argv[4];
(async () => {
    const algodclient = new algosdk.Algod(atoken, aserver, aport);
    let c = new client.HTTPClient('X-algo-api-token', atoken, aserver, aport);

    let status = await algodclient.status();
    console.log("STATUS", status);

    let txParams = await algodclient.getTransactionParams();
    console.log("TXPARAMS", txParams);

    let suggestedFee = await algodclient.suggestedFee();
    console.log("FEE", suggestedFee);

    let ledgerSupply = await algodclient.ledgerSupply();
    console.log("LEDGER SUPPLY", ledgerSupply);

    let versions = await algodclient.versions();
    console.log("VERSIONS", versions);

    if (process.argv.length === 7) {
        const data = await algodclient.transactionInformation(process.argv[5], process.argv[6]);
        console.log(JSON.stringify(data, null, 4));
        return;
    }

    let blkOrAddr = process.argv[5];
    if (!process.argv[5] || parseInt(blkOrAddr)) {
        var blockNum = parseInt(blkOrAddr);
        if (isNaN(blockNum)) {
            blockNum = status.lastRound;
        }
        let patched_block = async function (roundNumber) {
            if (!Number.isInteger(roundNumber))
                throw Error("roundNumber should be an integer");
            let res = await c.get("/v1/block/" + roundNumber);
            if (res.statusCode === 200) {
                if (res.body.txns.transactions) {
                    for (var i = 0; i < res.body.txns.transactions.length; i++) {
                        res.body.txns.transactions[i] = noteb64ToNote(res.body.txns.transactions[i]);
                    }
                }
            }
            return res.body;
        };
        const block = await patched_block(blockNum);
        console.log("BLOCK", blockNum);
        console.log(JSON.stringify(block, null, 4));
    } else {
        let patched_transactionByAddress = async function (addr, first, last) {
            if (!Number.isInteger(first) || !Number.isInteger(last))
                throw Error("first and last rounds should be integers");
            let res = await c.get("/v1/account/" + addr + "/transactions", {'firstRound': first, 'lastRound': last});
            if (res.statusCode === 200) {
                if (res.body.transactions) {
                    for (var i = 0; i < res.body.transactions.length; i++) {
                        res.body.transactions[i] = noteb64ToNote(res.body.transactions[i]);
                    }
                }
            }
            return res.body;
        };

        const data = await algodclient.accountInformation(blkOrAddr);
        console.log("ADDR", blkOrAddr);
        console.log(JSON.stringify(data, null, 4));
        console.log("RANGE", status.lastRound - 5000, status.lastRound);
        const data2 = await patched_transactionByAddress(blkOrAddr, status.lastRound, status.lastRound);
        console.log(JSON.stringify(data2, null, 4));
    }
})().catch(e => {
    console.log(e);
});

