import User from "../models/user";
import Listing from "../models/listing";
import Transaction from "../models/transaction";
import { fulfill, sendBitclout, sendEth } from "../utils/fulfiller";
import axios from "axios";
const config = require("../utils/config");
const logger = require("../utils/logger");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);
const webhookRouter = require("express").Router();

// const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
// const { tokenAuthenticator } = require("../utils/middleware");
import { createHmac } from "crypto";
function isValidSignature(request) {
  const token = "MgB1ZnvEyupXi_7VRMT3wUOkfaKV0d1z";
  const headers = request.headers;
  const signature = headers["x-alchemy-signature"]; // Lowercase for NodeJS
  const body = request.body;
  const hmac = createHmac("sha256", token); // Create a HMAC SHA256 hash using the auth token
  hmac.update(JSON.stringify(body), "utf8");
  const digest = hmac.digest("hex");
  console.log(signature, digest);
  return signature == digest; // If signature equals your computed hash, return true
}
webhookRouter.post("/escrow", async (req, res) => {
  if (isValidSignature(req)) {
    if (req.body.activity) {
      const { fromAddress, value, asset, hash } = req.body.activity[0];
      console.log(req.body.activity[0], fromAddress);
      const buyer = await User.findOne({
        ethereumaddress: fromAddress.toLowerCase(),
      }).exec();
      console.log(buyer);
      if (asset == "ETH") {
        if (buyer) {
          const listing = await Listing.findOne({
            buyer: buyer._id,
            ongoing: true,
          }).exec();
          console.log(listing);
          if (listing && !listing.completed.status) {
            if (value >= listing.etheramount) {
              listing.escrow.balance += value;
              listing.escrow.full = true;
              listing.save((err: any) => {
                if (err) {
                  console.log(err);
                  res.status(500).send("error saving listing");
                } else {
                  fulfill(listing._id);
                  res.sendStatus(200);
                }
              });
            } else {
              console.log("insufficient funds");
              res.status(400).send("insufficient funds");
            }
          } else {
            console.log("no listing found");
            res.status(400).send("no associated listing");
          }
        } else {
          console.log("buyer not found");
          res.status(400).send("buyer not found");
        }
      } else {
        console.log("txn type not valid");
        res.status(400).send("txn type not valid");
      }
      // });
    } else {
      console.log("invalid request");
      res.status(400).send("invalid request");
    }
  } else {
    console.log("unauthorized request");
    res.status(400).send("unauthorized request");
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
            .then((id) => {
              listing.bitcloutTransactionId = id;
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
          // let resjson = JSON.parse(response);
          console.log(response);
          user.bitswapbalance -= transaction.bitcloutnanos;
          transaction.status = "completed";
          transaction.completed = new Date();
          transaction.tx_id = response;
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
    } else {
      res.status(500).send("invalid txn");
    }
  } else {
    res.status(500).send("txn/user not found");
  }
});

export default webhookRouter;
