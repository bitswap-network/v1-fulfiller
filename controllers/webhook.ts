import User from "../models/user";
import Listing from "../models/listing";
import Transaction from "../models/transaction";
import { fulfill, sendBitclout } from "../utils/fulfiller";
const Web3 = require("web3");
const webhookRouter = require("express").Router();
const config = require("../utils/config");
// const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
// const { tokenAuthenticator } = require("../utils/middleware");
import { createHmac } from "crypto";
function isValidSignature(request) {
  const token = "MgB1ZnvEyupXi_7VRMT3wUOkfaKV0d1z";
  const headers = request.headers;
  const signature = headers["x-alchemy-signature"]; // Lowercase for NodeJS
  // const body = request.body;
  const hmac = createHmac("sha256", token); // Create a HMAC SHA256 hash using the auth token
  // hmac.update(body, "utf8");
  const digest = hmac.digest("hex");
  return signature === digest; // If signature equals your computed hash, return true
}
webhookRouter.post("/escrow", async (req, res) => {
  if (isValidSignature(req)) {
    if (req.body.activity) {
      const { fromAddress, value, asset, hash } = req.body.activity[0];
      console.log(req.body.activity[0], fromAddress);
      const buyer = await User.findOne({
        ethereumaddress: fromAddress.toLowerCase(),
      });
      // web3.eth.getTransaction(hash).then(async (response) => {
      if (asset == "ETH") {
        if (buyer) {
          const listing = await Listing.findOne({
            buyer: buyer._id,
          }).exec();
          if (listing) {
            if (value >= listing.etheramount) {
              listing.escrow.balance += value;
              listing.escrow.full = true;
              fulfill(listing._id);
            } else {
              res.status(400).send("insufficient funds");
            }
          } else {
            res.status(400).send("no associated listing");
          }
        } else {
          res.status(400).send("buyer not found");
        }
      } else {
        res.status(400).send("txn hash not valid");
      }
      // });
    } else {
      res.status(400).send("invalid request");
    }
  } else {
    res.status(400).send("unauthorized request");
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
      sendBitclout(transaction!.bitcloutpubkey, transaction!.bitcloutnanos, 0)
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
