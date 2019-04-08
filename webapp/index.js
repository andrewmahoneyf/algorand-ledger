require('babel-polyfill');
const address = require('algosdk/src/encoding/address');
const Transport = require('@ledgerhq/hw-transport-webusb');

const $button = document.getElementById("button");
const $main = document.getElementById("main");
$button.addEventListener("click", async () => {
    try {
        const transport = await Transport.default.create();
        //const transport = await  Transport.default.open("");
        transport.setDebugMode(true);
        //transport.setScrambleKey(Buffer.from("0000000000", 'hex'));
        const h2 = document.createElement("h2");
        const pubData = await transport.exchange(Buffer.from("8003000000", 'hex'));
        const addr = pubData.slice(0, pubData.length - 2);
        console.log("XXXXX", pubData);
        h2.textContent = address.encode(addr); //Buffer.from(pubData).toString('hex');
        $main.innerHTML = "<h1>RET:</h1>";
        $main.appendChild(h2);
    } catch (e) {
        const $err = document.createElement("code");
        $err.style.color = "#f66";
        $err.textContent = String(e.message || e);
        $main.appendChild($err);
        throw e;
    }
});
