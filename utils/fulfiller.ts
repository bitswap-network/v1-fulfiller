import Listing from "../models/listing";
import User from "../models/user";
import axios from "axios";
import proxy from "./proxy";

const logger = require("./logger");
const Tx = require("ethereumjs-tx").Transaction;
const config = require("./config");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount(
  "0x" + config.SECRET
);
const getListings = async () => {
  let listings = await Listing.find({
    ongoing: true,
    escrow: { full: true },
  }).exec();
  return listings;
};

const sendEth = async (
  ethereumaddress: string,
  value: number,
  txnfee: number,
  nonce: number,
  gasprice: number
) => {
  let rawTx = {
    to: ethereumaddress,
    value: web3.utils.toHex(
      web3.utils.toWei((value - value * txnfee).toString(), "ether")
    ),
    gasLimit: web3.utils.toHex(21000),
    gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString), "gwei"),
    nonce: web3.utils.toHex(nonce + 1),
  };
  let tx = new Tx(rawTx, { chain: "mainnet" });
  tx.sign(web3.utils.hexToBytes("0x" + config.SECRET));
  let serializedTx = tx.serialize();
  web3.eth
    .sendSignedTransaction("0x" + serializedTx.toString("hex"))
    .then((hash) => {
      return hash;
    })
    .catch((error) => {
      throw error;
    });
};

const sendBitclout = async (bitcloutpubkey: string, amountnanos: number) => {
  await proxy.initiateSendBitclout(20, bitcloutpubkey, amountnanos);
  await proxy
    .sendBitclout()
    .then((response) => {
      console.log(response);
      proxy.close();
      if (JSON.parse(response).TransactionIDBase58Check) {
        return JSON.parse(response).TransactionIDBase58Check;
      } else {
        return "";
      }
    })
    .catch((error) => {
      proxy.close();
      throw error;
    });
};

const fulfill = async () => {
  let listings = await getListings();
  let gas = await axios.get("https://ethgasstation.info/json/ethgasAPI.json");
  let nonce = await web3.eth.getTransactionCount(
    escrowWallet.address,
    "pending"
  );
  if (listings.length > 0) {
    for (let listing of listings) {
      let buyer = await User.findOne({ _id: listing.buyer }).exec();
      let seller = await User.findOne({ _id: listing.seller }).exec();
      await sendEth(
        seller.ethereumaddress,
        listing.etheramount,
        0.04,
        nonce,
        gas.data.average / 10
      )
        .then((hash) => {
          listing.finalTransactionId = hash;
        })
        .catch((error) => {
          logger.error(error);
        });
      await sendBitclout(buyer.bitcloutpubkey, listing.bitcloutamount)
        .then((id) => {
          listing.bitcloutTransactionId = id;
          seller.bitswapbalance -= listing.bitcloutamount;
        })
        .catch((error) => {
          logger.error(error);
        });
      buyer.buys.push(listing._id);
      buyer.completedtransactions += 1;
      seller.completedtransactions += 1;
      buyer.buystate = false;
      listing.ongoing = false;
      listing.completed = {
        status: true,
        date: Date.now(),
      };
      await listing.save();
      await buyer.save();
      await seller.save();
    }
  }
};
export default fulfill;
