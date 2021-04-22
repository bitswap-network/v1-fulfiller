import Listing from "../models/listing";
import User from "../models/user";
import axios from "axios";
import Proxy from "./proxy";
import { response } from "express";
const EthereumTx = require("ethereumjs-tx").Transaction;

const logger = require("./logger");
// const Tx = require("ethereumjs-tx").Transaction;
const config = require("./config");
const Web3 = require("web3");
const web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://eth-mainnet.alchemyapi.io/v2/xhIIdjrFA63X5jKpLK2mm5ZLjgy-jQaH"
  )
);

const fee = 0;
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);

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

const sendBitclout = async (
  bitcloutpubkey: string,
  amountnanos: number,
  txnfee: number
) => {
  let proxy = new Proxy();
  await proxy.initiateSendBitclout(
    30,
    bitcloutpubkey,
    amountnanos - amountnanos * txnfee
  );
  return proxy
    .sendBitclout()
    .then((response) => {
      // console.log(response);
      proxy.close();
      if (JSON.parse(response).TransactionIDBase58Check) {
        return JSON.parse(response).TransactionIDBase58Check;
      }
    })
    .catch((error) => {
      proxy.close();
      throw error;
    });
};

const fulfill = async (listing_id: string) => {
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
      await sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, fee)
        .then((id) => {
          listing.bitcloutTransactionId = id;
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
              listing.escrowsent = true;
              buyer.buys.push(listing._id);
              buyer.completedtransactions += 1;
              seller.completedtransactions += 1;
              buyer.buystate = false;
              listing.ongoing = false;
              listing.completed = {
                status: true,
                date: new Date(),
              };

              listing.save();
              buyer.save();
              seller.save();
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
export { fulfill, sendBitclout, sendEth };
