import User from "../models/user";
import Listing from "../models/listing";
import Transaction from "../models/transaction";
import {
  process,
  sendBitclout,
  sendEth,
  submitTransaction,
} from "../utils/fulfiller";
import { processListing, markListingAsCompleted } from "../utils/functions";
import axios from "axios";
import * as config from "../utils/config";
const logger = require("../utils/logger");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);
const webhookRouter = require("express").Router();
import { createHmac } from "crypto";

function isValidSignature(request) {
  const token = config.AlchemyAuth ? config.AlchemyAuth : "";
  const headers = request.headers;
  const signature = headers["x-alchemy-signature"]; // Lowercase for NodeJS
  const body = request.body;
  const hmac = createHmac("sha256", token); // Create a HMAC SHA256 hash using the auth token
  hmac.update(JSON.stringify(body), "utf8");
  const digest = hmac.digest("hex");
  console.log("sigdig: ", signature, digest);
  return signature === digest; // If signature equals your computed hash, return true
}

webhookRouter.post("/escrow", async (req, res) => {
  if (isValidSignature(req)) {
    const { fromAddress, toAddress, value, asset, hash } = req.body.activity[0];

    // If the transaction is sent to the wallet
    if (fromAddress.toLowerCase() === escrowWallet.address.toLowerCase()) {
      try {
        await markListingAsCompleted(toAddress, hash, asset);
      } catch (error) {
        res.sendStatus(error);
      }
    } else {
      try {
        await processListing(fromAddress, value, asset);
        res.sendStatus(204);
      } catch (error) {
        res.sendStatus(error);
      }
    }
  }
});

webhookRouter.post("/fulfillretry", async (req, res) => {
  const gas = await axios.get("https://ethgasstation.info/json/ethgasAPI.json");
  const nonce = await web3.eth.getTransactionCount(
    escrowWallet.address,
    "pending"
  );
  const { listing_id } = req.body;
  const listing = await Listing.findOne({
    _id: listing_id,
    ongoing: true,
  }).exec();
  if (listing) {
    const buyer = await User.findOne({ _id: listing.buyer }).exec();
    const seller = await User.findOne({ _id: listing.seller }).exec();
    if (buyer && seller) {
      if (listing.escrow.full && !listing.completed.status) {
        if (!listing.escrowsent) {
          await sendEth(
            seller.ethereumaddress,
            listing.etheramount,
            0,
            nonce,
            gas.data.average / 10
          )
            .then((result) => {
              console.log(result);
              listing.finalTransactionId = result.transactionHash;
              listing.escrowsent = true;
              logger.info("escrow sent");
              if (listing.bitcloutsent) {
                buyer.buys.push(listing._id);
                buyer.completedtransactions += 1;
                seller.completedtransactions += 1;
                buyer.buystate = false;
                listing.ongoing = false;
                listing.completed = {
                  status: true,
                  date: new Date(),
                };
                res.sendStatus(200);
              }
              listing.save();
              buyer.save();
              seller.save();
            })
            .catch((error) => {
              res.status(500).send("could not fulfill $eth txn");
              logger.error(error);
            });
        }
        if (!listing.bitcloutsent) {
          await sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, 0.04)
            .then((response) => {
              listing.bitcloutTransactionId = response.data.TxnHashHex;
              listing.bitcloutsent = true;
              logger.info("bitclout sent");
              if (listing.escrowsent) {
                buyer.buys.push(listing._id);
                buyer.completedtransactions += 1;
                seller.completedtransactions += 1;
                buyer.buystate = false;
                listing.ongoing = false;
                listing.completed = {
                  status: true,
                  date: new Date(),
                };
                res.sendStatus(200);
              }
              listing.save();
              buyer.save();
              seller.save();
            })
            .catch((error) => {
              res.status(500).send("could not fulfill $btclt txn");
              logger.error(error);
            });
        }
      }
    } else {
      res.status(400).send("buyer or seller not found");
    }
  } else {
    res.status(400).send("listing not found");
  }
});

webhookRouter.post("/withdraw", async (req, res) => {
  const { username, txn_id } = req.body;
  const transaction = await Transaction.findOne({ _id: txn_id }).exec();
  const user = await User.findOne({ username: username }).exec();
  if (transaction && user) {
    if (
      transaction.transactiontype == "withdraw" &&
      transaction.status == "pending"
    ) {
      sendBitclout(transaction.bitcloutpubkey, transaction.bitcloutnanos, 0)
        .then((response) => {
          console.log(response);
          submitTransaction(response.data.TransactionHex)
            .then((txnresponse) => {
              console.log(txnresponse);
              user.bitswapbalance -= transaction.bitcloutnanos / 1e9;
              transaction.status = "completed";
              transaction.completed = new Date();
              transaction.tx_id = txnresponse.data.TxnHashHex;
              transaction.save((err: any) => {
                if (err) {
                  console.log(err);
                  res.status(500).send("txn failed to save");
                } else {
                  user.save((err: any) => {
                    if (err) {
                      console.log(err);
                      res.status(500).send("user failed to save");
                    } else {
                      res.sendStatus(200);
                    }
                  });
                }
              });
            })
            .catch((error) => {
              console.log("ERROR ", error);
              res.status(500).send(error);
            });
        })
        .catch((error) => {
          console.log("ERROR ", error);
          res.status(500).send(error);
        });
    } else {
      res.status(500).send("invalid txn");
    }
  } else {
    res.status(500).send("txn/user not found");
  }
});

export default webhookRouter;
