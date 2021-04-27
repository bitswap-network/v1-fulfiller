import Listing from "../models/listing";
import User from "../models/user";
import axios from "axios";
import { response } from "express";
import { handleSign } from "./identity";
const EthereumTx = require("ethereumjs-tx").Transaction;

const logger = require("./logger");
import * as config from "./config";
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const fee = 0;
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);

console.log(config);

const sendEth = (
  ethereumaddress: string,
  value: number,
  txnfee: number,
  nonce: number,
  gasprice: number
) => {
  let rawTx = {
    to: ethereumaddress,
    from: escrowWallet.address,
    value: web3.utils.toHex(
      web3.utils.toWei(
        (value - value * txnfee - (21000 * gasprice) / 1e9).toString()
      )
    ),
    gasLimit: web3.utils.toHex(21000),
    gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString(), "gwei")),
    nonce: web3.utils.toHex(nonce),
  };
  console.log(rawTx, escrowWallet, gasprice, nonce);
  const transaction = new EthereumTx(rawTx, {
    chain: "mainnet",
  });
  transaction.sign(web3.utils.hexToBytes(escrowWallet.privateKey));
  const serializedTransaction = transaction.serialize();

  return web3.eth.sendSignedTransaction(
    "0x" + serializedTransaction.toString("hex")
  );
};

const sendBitclout = (
  bitcloutpubkey: string,
  amountnanos: number,
  txnfee: number
) => {
  console.log("sending bclt");

  return axios.post(
    "https://api.bitclout.com/send-bitclout",
    JSON.stringify({
      AmountNanos: amountnanos,
      MinFeeRateNanosPerKB: 1000,
      RecipientPublicKeyOrUsername: bitcloutpubkey,
      SenderPublicKeyBase58Check: config.PUBLIC_KEY,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie:
          "__cfduid=d0e96960ab7b9233d869e566cddde2b311619467183; INGRESSCOOKIE=e663da5b29ea8969365c1794da20771c",
      },
    }
  );
};
const submitTransaction = async (txnhex: string) => {
  const signedTxn = handleSign({
    encryptedSeedHex: config.ENCRYPTEDSEEDHEX,
    transactionHex: txnhex,
  });

  console.log("submitting txn");
  return axios.post(
    "https://api.bitclout.com/submit-transaction",
    JSON.stringify({
      TransactionHex: signedTxn.signedTransactionHex,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie:
          "__cfduid=d0e96960ab7b9233d869e566cddde2b311619467183; INGRESSCOOKIE=e663da5b29ea8969365c1794da20771c",
      },
    }
  );
};

const process = async (listing_id: string) => {
  const gas = await axios.get("https://ethgasstation.info/json/ethgasAPI.json");
  // console.log(gas);
  const nonce = await web3.eth.getTransactionCount(
    escrowWallet.address,
    "pending"
  );
  const listing = await Listing.findOne({ _id: listing_id }).exec();

  if (listing) {
    const buyer = await User.findOne({ _id: listing.buyer }).exec();
    const seller = await User.findOne({ _id: listing.seller }).exec();
    if (buyer && seller) {
      sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, fee)
        .then((response) => {
          submitTransaction(response.data.TransactionHex)
            .then((txnresponse) => {
              listing.bitcloutTransactionId = txnresponse.data.TxnHashHex;
              listing.bitcloutsent = true;
              logger.info("bitclout sent");
              sendEth(
                seller.ethereumaddress,
                listing.etheramount,
                fee,
                nonce,
                gas.data.average / 10
              )
                .then((result) => {
                  listing.finalTransactionId = result.transactionHash;
                  // listing.escrowsent = true;
                  // buyer.buys.push(listing._id);
                  // buyer.completedtransactions += 1;
                  // seller.completedtransactions += 1;
                  // buyer.buystate = false;
                  // listing.ongoing = false;
                  // listing.completed = {
                  //   status: true,
                  //   date: new Date(),
                  // };

                  listing.save();
                  // buyer.save();
                  // seller.save();
                })
                .catch((error) => {
                  logger.error(error);
                });
            })
            .catch((error) => {
              logger.error(error);
            });
        })
        .catch((error) => {
          logger.error(error);
        });

      return 1;
    } else {
      logger.error("Buyer/Seller not found");
      throw Error("Buyer/Seller not found");
    }
  } else {
    logger.error("Listing not found");
    throw Error("Listing not found");
  }
};
export { process, sendBitclout, sendEth, submitTransaction };
