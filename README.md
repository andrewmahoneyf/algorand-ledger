# Algorand Ledger #
Scripts to sign transaction in Algorand Blockchain using ledger.
Stay tunned @algofabrik

## Requirements ##
* Algorand Ledger Nano firmware: https://github.com/algorand/ledger-app-algorand
* NodeJS
* Git

## Installation ##
The scripts use node and npm.

- Install node
- Clone the repository ```git clone https://github.com/CoinFabrik/algorand-ledger```.
- Switch to the cloned directory ```cd algorand-ledger```
- Install dependencies ```npm install```
- Read the usage section for instructions on how to use the scripts

## Usage ##
The process of sending a transaction is done in three steps:

1. Create the transaction using the prepare_transaction.js script
2. Sign the transaction. There are two alternative: sign_with_ledger.js uses the ledger to sign, sign_with_priv.js can use a private key generate by algokey tool and saved in a file
3. Send the transaction to the network. Use the send.js script

## Scripts ##

* Prepare_transaction.js is the first script that you need to run is: 
```node prepare_transaction.js to amount fee firstblock [pks | pks... threshold]```
Where: 
    * To is the destination address
    * Amount is the amount in algos
    * Fee is the fee in algos
    * First block is used to declare the range in which the transaction is valid, the script use (firstblock, firstblock + 1000) that is the maximum range possible.
    * Pks are can be one public address in a regular transaction or multiple public addresses for a multi-signature transaction. 
    * Threshold: In the case of a multi-signature a threshold must be added that is the minimum quantity of signatures needed to validate the transaction.
This script prints a json with the information to be signed. The json can be saved to a file or using a pipe pass it to some of the signing scripts.

* Sign_with_ledger.js
```node sign_with_ledger.js transaction```
This script reads the public address from the ledger app, check the from field (or some pk in the case of a multisignature) and 
sends the transaction to the ledger and sign it.

* Sign_with_priv.js 
```node sign_with_priv.js priv_filename```
This script read a private key generated by the algokey tool (form algorand distribution) from the ***priv_filename*** file it deduces the public key and check the from field (or some pk in the case of a multisignature). 
Then it signs the transaction.
    
* Send.js
```node send.js server_token server_ip server_port [tx_input_file]```
This scripts take the transaction from stdinput or read it from tx_input_file and then it publish it in the network returning the transaction id.

## How it works TLDR; ##

The scripts uses Json to encode the transaction data. 

The signatures are added to the json generated by prepare_transaction.js.

For example a transaction from address KKNXJL6OIIPIAOKHK62UMJAI7LCFXXGTIUZNDQIBDN6LFBNT7VQNIGHACY to 3YTLLBUEODAAVQSAZ7MTADKKXUWOUJCBLCOFI2UIHA6OEX4E23TO5O4RWI with amount 1234, fee 100 and that must be inserted in the algorand blockchain between 
blocks 5555 and 6666 is represented as:
```
{
    "txn": {
        "type": "pay",
        "from": "KKNXJL6OIIPIAOKHK62UMJAI7LCFXXGTIUZNDQIBDN6LFBNT7VQNIGHACY",
        "to": "3YTLLBUEODAAVQSAZ7MTADKKXUWOUJCBLCOFI2UIHA6OEX4E23TO5O4RWI",
        "fee": 100,
        "amount": 1234,
        "firstRound": 5555,
        "lastRound": 6555,
        "genesisID": "testnet-v31.0"
    }
}
```

After signing the sig field is added:
```
{
    "sig": "7R66M4RAT2KRR4O6LZ4ND7KW6K4QI3HXDKXCYCIVJRTJ3ZH5E4IHLQUORTLHX6C2MU22SP745PNQAFKTUCPAODDZXZHRNNKVDNWBSDY=",
    "txn": {
        "type": "pay",
        "from": "KKNXJL6OIIPIAOKHK62UMJAI7LCFXXGTIUZNDQIBDN6LFBNT7VQNIGHACY",
        "to": "3YTLLBUEODAAVQSAZ7MTADKKXUWOUJCBLCOFI2UIHA6OEX4E23TO5O4RWI",
        "fee": 100,
        "amount": 1234,
        "firstRound": 5555,
        "lastRound": 6555,
        "genesisID": "testnet-v31.0"
    }
}
```

In the case of a multi signature transaction a list of the public addresses that must sign the transaction is added by prepare_transaction.js and also the from address is calculated from those public keys.

An example of the json before signing:
```
{
    "txn": {
        "type": "pay",
        "from": "63YGS2NQB3HF6BMGK6IT5N7B3WLRFJYMEDPWB7YNRQEARPU2L65E74TMBM",
        "to": "3YTLLBUEODAAVQSAZ7MTADKKXUWOUJCBLCOFI2UIHA6OEX4E23TO5O4RWI",
        "fee": 100,
        "amount": 1234,
        "firstRound": 5555,
        "lastRound": 6555,
        "genesisID": "testnet-v31.0"
    },
    "msig": {
        "subsig": [
            {
                "pk": "KKNXJL6OIIPIAOKHK62UMJAI7LCFXXGTIUZNDQIBDN6LFBNT7VQNIGHACY"
            },
            {
                "pk": "OPH5MFQSAEDCJDSG7ZROACLHFDLQEDW4DFB75BJ5342EPX24APOID6Q2LQ"
            }
        ],
        "threshold": 1,
        "version": 1
    }
}
```

A multi-signature transaction must be signed more than once by each of the public addresses that from the multi-signature wallet. The threshold argument determines how many signatures are needed to validate a multi-signature transaction.
Each signing step adds a sk field to the corresponding pk entry in the msig.subsig object. 

For example after a signature we get:
```
{
    "msig": {
        "subsig": [
            {
                "pk": "KKNXJL6OIIPIAOKHK62UMJAI7LCFXXGTIUZNDQIBDN6LFBNT7VQNIGHACY"
            },
            {
                "pk": "OPH5MFQSAEDCJDSG7ZROACLHFDLQEDW4DFB75BJ5342EPX24APOID6Q2LQ",
                "sig": "PWLMAYFGCUIBADIEXUERUJWOD3N4POQJM72N3NYQ4YPLUVTQHYF3YHBTQKNBTHPDMJIXZROIJ6PCFM5GKL7VNXUY3CWDPJGPHYAGSDI="
            }
        ],
        "threshold": 1,
        "version": 1
    },
    "txn": {
        "type": "pay",
        "from": "63YGS2NQB3HF6BMGK6IT5N7B3WLRFJYMEDPWB7YNRQEARPU2L65E74TMBM",
        "to": "3YTLLBUEODAAVQSAZ7MTADKKXUWOUJCBLCOFI2UIHA6OEX4E23TO5O4RWI",
        "fee": 100,
        "amount": 1234,
        "firstRound": 5555,
        "lastRound": 6555,
        "genesisID": "testnet-v31.0"
    }
}
```

Finally the send script uses the algorand node rest api to send the transaction to the network.

## Examples ##

### Single signature ###
node prepare_transaction.js 3YTLLBUEODAAVQSAZ7MTADKKXUWOUJCBLCOFI2UIHA6OEX4E23TO5O4RWI 1233 100 288206 KKNXJL6OIIPIAOKHK62UMJAI7LCFXXGTIUZNDQIBDN6LFBNT7VQNIGHACY | node sign_with_ledger.js | node send.js 7fa7c128461e1486619e2b33542da289b85b2eec54d6800abe169c5cc1bdc063 10.10.0.85 8080

Resulting transaction:
https://algoexplorer.io/tx/RNX5GWIIBZA277AC5JDUQIBFCPSEOOG7SS4J45IVNGAQ72FEBDYA

### Multi signature ###
node prepare_transaction.js 3YTLLBUEODAAVQSAZ7MTADKKXUWOUJCBLCOFI2UIHA6OEX4E23TO5O4RWI 1233 100 272001 Z6IMXKHPUNR4YVDTNSYDLE4DGBRRU7VLAY4NOQ2JEEZBTCKJ72KSVX7TE4 OPH5MFQSAEDCJDSG7ZROACLHFDLQEDW4DFB75BJ5342EPX24APOID6Q2LQ J4GGCZW7JA5NKQDX4U5TRX4AR7YPNZRX7VQ44YCUJ3BYEEO72KEKKWVNBM  | node sign_with_ledger.js | node sign_with_priv.js key.priv | node send.js 7fa7c128461e1486619e2b33542da289b85b2eec54d6800abe169c5cc1bdc063 10.10.0.85 8080

The resulting transaction:
http://algoexplorer.io/tx/J2NYPVZBZJZRQWPO7DBKRGBKVH22XDO4MTJWIGL657JYHO35MJHA
