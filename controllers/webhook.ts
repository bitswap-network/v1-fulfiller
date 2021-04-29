import User from "../models/user";
import Listing from "../models/listing";
import Transaction from "../models/transaction";
import { sendBitclout, submitTransaction } from "../utils/fulfiller";
import { processListing, markListingAsCompleted } from "../utils/functions";
import axios from "axios";
import * as config from "../utils/config";
import { verifyAlchemySignature, verifySignature } from "../utils/identity";

const logger = require("../utils/logger");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount(
  "0x" + config.WALLET_SECRET
);

const webhookRouter = require("express").Router();

webhookRouter.post("/escrow", async (req, res) => {
  if (verifyAlchemySignature(req)) {
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

webhookRouter.post("/withdraw", async (req, res) => {
  if (verifySignature(req)) {
    const { username, txn_id } = req.body;
    const transaction = await Transaction.findOne({ _id: txn_id }).exec();
    const user = await User.findOne({ username: username }).exec();

    if (transaction && user) {
      if (
        transaction.transactiontype == "withdraw" &&
        transaction.status == "pending"
      ) {
        let txnAmountFeesDeducted =
          transaction.bitcloutnanos - transaction.fees;
        sendBitclout(transaction.bitcloutpubkey, txnAmountFeesDeducted, 0)
          .then((response) => {
            let txnBase58 = response.data.TransactionIDBase58Check;
            submitTransaction(response.data.TransactionHex)
              .then((txnresponse) => {
                console.log(txnresponse);
                user.bitswapbalance -= transaction.bitcloutnanos / 1e9;
                transaction.status = "completed";
                transaction.completed = new Date();
                transaction.tx_id = txnBase58;
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
  } else {
    res.status(403).send("unauthorized request");
  }
});

export default webhookRouter;
