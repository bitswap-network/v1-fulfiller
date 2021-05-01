import { processListing, markListingAsCompleted } from "../utils/functions";
import * as config from "../utils/config";
import { verifyAlchemySignature, verifySignature } from "../utils/identity";
import Listing from "../models/listing";

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

    // If the transaction is successfully sent from the wallet
    // Mark the listing as completed
    if (fromAddress.toLowerCase() === escrowWallet.address.toLowerCase()) {
      try {
        await markListingAsCompleted(toAddress, hash, asset);
      } catch (error) {
        console.log(error);
        res.sendStatus(error);
      }
    } else {
      // Transaction is sent to the wallet
      try {
        await processListing(fromAddress, value, asset, false, null);
        res.sendStatus(204);
      } catch (error) {
        console.log(error);
        res.sendStatus(error);
      }
    }
  }
});

webhookRouter.post("/retry", async (req, res) => {
  if (verifySignature(req)) {
    const { listing_id } = req.body;
    try {
      await processListing(null, null, null, true, listing_id);
      res.sendStatus(204);
    } catch (error) {
      console.log(error);
      res.sendStatus(error);
    }
  }
});

export default webhookRouter;
