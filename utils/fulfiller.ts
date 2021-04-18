import Listing from "../models/listing";
import User from "../models/user";
import axios from "axios";
import Proxy from "./proxy";

const logger = require("./logger");
const Tx = require("ethereumjs-tx").Transaction;
const config = require("./config");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);

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
    gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString()), "gwei"),
    nonce: web3.utils.toHex(nonce + 1),
  };
  let tx = new Tx(rawTx, { chain: "kovan" });
  tx.sign(web3.utils.hexToBytes("0x" + config.SECRET));
  let serializedTx = tx.serialize();
  return web3.eth
    .sendSignedTransaction("0x" + serializedTx.toString("hex"))
    .then((hash) => {
      return hash;
    })
    .catch((error) => {
      throw error;
    });
};

const sendBitclout = async (
  bitcloutpubkey: string,
  amountnanos: number,
  txnfee: number
) => {
  let proxy = new Proxy();
  await proxy.initiateSendBitclout(
    20,
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
      sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, 0.04)
        .then((id) => {
          listing.bitcloutTransactionId = id;
          seller.bitswapbalance -= listing.bitcloutnanos;
          listing.bitcloutsent = true;
          logger.info("bitclout sent");
          sendEth(
            seller.ethereumaddress,
            listing.etheramount,
            0.04,
            nonce,
            gas.data.average / 10
          )
            .then((hash) => {
              listing.finalTransactionId = hash;
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
