import Listing from "../models/listing";
import Pool from "../models/pool";
import User from "../models/user";
import axios from "axios";
import { response } from "express";
import { handleSign } from "./identity";
import { decryptAddress } from "./functions";
const EthereumTx = require("ethereumjs-tx").Transaction;

const logger = require("./logger");
import * as config from "./config";
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const swapfee = 0.02;

console.log(config);

const sendEth = (
  priv_key: string,
  from_address: string,
  to_address: string,
  value: number,
  nonce: number,
  gasprice: number,
  fee: number
) => {
  let rawTx = {
    to: to_address,
    from: from_address,
    value: web3.utils.toHex(
      web3.utils.toWei(
        (value - value * fee - (21000 * gasprice) / 1e9).toString()
      )
    ),
    gasLimit: web3.utils.toHex(21000),
    gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString(), "gwei")),
    nonce: web3.utils.toHex(nonce),
  };
  console.log(rawTx, gasprice, nonce);
  const transaction = new EthereumTx(rawTx, {
    chain: config.NETWORK,
  });
  transaction.sign(web3.utils.hexToBytes(priv_key));
  const serializedTransaction = transaction.serialize();

  return web3.eth.sendSignedTransaction(
    "0x" + serializedTransaction.toString("hex")
  );
};

const sendBitclout = (
  bitcloutpubkey: string,
  amountnanos: number,
  fee: number
) => {
  console.log("sending bclt");

  return axios.post(
    "https://api.bitclout.com/send-bitclout",
    JSON.stringify({
      AmountNanos: parseInt((amountnanos - amountnanos * fee).toString()),
      MinFeeRateNanosPerKB: 1000,
      RecipientPublicKeyOrUsername: bitcloutpubkey,
      SenderPublicKeyBase58Check: config.PUBLIC_KEY_BITCLOUT,
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
  const listing = await Listing.findOne({ _id: listing_id }).exec();
  const pool = await Pool.findById(listing!.pool).exec();
  const gas = await axios.get(
    `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${config.ETHERSCAN_KEY}`
  );
  const nonce = await web3.eth.getTransactionCount(pool!.address, "pending");
  console.log(gas, nonce);

  if (listing && pool) {
    let key = decryptAddress(pool.privateKey);
    const buyer = await User.findOne({ _id: listing.buyer }).exec();
    const seller = await User.findOne({ _id: listing.seller }).exec();
    let sendaddress = listing.ethaddress
      ? listing.ethaddress
      : Array.isArray(seller?.ethereumaddress)
      ? seller?.ethereumaddress[0]
      : seller?.ethereumaddress;
    console.log(sendaddress);
    if (buyer && seller && sendaddress) {
      sendEth(
        key,
        pool.address,
        sendaddress,
        listing.etheramount,
        nonce,
        parseInt(gas.data.result.FastGasPrice.toString()),
        swapfee
      )
        .then(async (result) => {
          console.log("sendEthResult", result);
          listing.finalTransactionId = result.transactionHash.toLowerCase();
          await listing.save();
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
