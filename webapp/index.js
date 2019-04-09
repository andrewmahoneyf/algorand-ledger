require('babel-polyfill');
const Transport = require('@ledgerhq/hw-transport-webusb');
const encoding = require("algosdk/src/encoding/encoding");
const common = require('../common');
window.jQuery = $ = require("jquery");
require('popper.js/dist/umd/popper');
require('bootstrap/dist/js/bootstrap');
require('./node_modules/bootstrap/dist/css/bootstrap.css');
let tr;
async function getTransport() {
    if (!tr) {
        tr = Transport.default.create();
    }
    return await tr;
}

async function getAddr() {
    const addr = await common.ledger_get_pub_addr(await getTransport());
    $("#pk0").val(addr);
    return addr;
}
async function withTx(doit) {
    $("#txErr").remove();
    const txArea = $("textarea#transaction");
    try {
        const text = txArea.val();
        const transaction = JSON.parse(text);
        let addr = $("#pk0").val();
        let newTx = await doit(addr, transaction);
        txArea.val(JSON.stringify(newTx, null, 4));
        return newTx;
    } catch (e) {
        const $err = document.createElement("code");
        $err.style.color = "#f66";
        $err.textContent = String(e.message || e);
        $err.id = "txErr";
        txArea.after($err);
    }
    return false;
}

async function validateTx() {
    return withTx(async (addr, transaction) => {
        await common.signTX(addr, transaction, async (txn) => {
            return "";
        });
        return transaction;
    });
}


$(document).ready(function () {
    $("#regular-btn").click(async function (e) {
        e.preventDefault();
        const tx = common.prepare_transaction("to", "amount", "fee", "firstBlock", "publicKeys", "lastBlock");
        const txVal = JSON.stringify(tx, null, 4);
        $("textarea#transaction").val(txVal);
        await validateTx();
    });
    $("#multisig-btn").click(async function (e) {
        e.preventDefault();
        publicKeys = {
            pks: ["", ""],
            version: 1,
            threshold: 1
        };
        const tx = common.prepare_transaction("to", "amount", "fee", "firstBlock", publicKeys, "lastBlock");
        const txVal = JSON.stringify(tx, null, 4);
        $("textarea#transaction").val(txVal);
        await validateTx();
    });
    $("#get-addr-btn").click(async function (e) {
        e.preventDefault();
        $("#addrErr").remove();
        try {
            await getAddr();
        } catch (e) {
            const $err = document.createElement("code");
            $err.style.color = "#f66";
            $err.textContent = String(e.message || e);
            $err.id = "addrErr";
            $("#pk0").after($err);
        }
    });
    $("#sign-tx-btn").click(async function (e) {
        e.preventDefault();
        await withTx(async (addr, tx) => {
            if (!addr) {
                addr = await getAddr();
            }
            return await common.signTX(addr, tx, async (txn) => {
                return common.ledger_sign(await getTransport(), txn);
            });
        });
    });
    $("#send-tx-btn").click(async function (e) {
        e.preventDefault();
        const sendResult = $("#send-result");
        try {
            let validTx = await withTx(async (addr, tx) => {
                if (!addr) {
                    addr = await getAddr();
                }
                if ("sig" in tx) {
                    return tx;
                } else {
                    return await common.signTX(addr, tx, async (txn) => {
                        return common.ledger_sign(await getTransport(), txn);
                    });
                }
            });
            if (validTx) {
                const atoken = $("#server-token").val();
                const url = $("#server-url").val() + "/v1/transactions";
                const sTxn = common.getStxn(validTx);
                const rawOutput = new Uint8Array(encoding.encode(sTxn));
                // TODO: Do it better.
                $.ajax({
                    type: "POST",
                    url: url,
                    crossDomain: true,
                    beforeSend: function (request) {
                        request.setRequestHeader("X-algo-api-token", atoken);
                    },
                    data: Buffer.from(rawOutput),
                    processData: false,
                    success: function (responseData, textStatus, jqXHR) {
                        console.log("TXID", responseData, textStatus, jqXHR);
                        sendResult.css('color', 'green');
                        sendResult.text(JSON.stringify(responseData));
                    },
                    error: function (e) {
                        console.error("Error sending transaction", e);
                        sendResult.css('color', 'red');
                        sendResult.text(JSON.stringify((e.message || e)));
                    }
                });
            } else {
                throw new Error("Error processing transaction");
            }
        } catch (e) {
            console.error("Error sending transaction", e);
            sendResult.css('color', 'red');
            sendResult.text(String(e.message || e));
        }
    });
    $("textarea#transaction").on('input propertychange', async function (e) {
        await validateTx();
    });
});