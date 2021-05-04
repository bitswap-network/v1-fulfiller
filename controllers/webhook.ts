import { processListing, markListingAsCompleted } from "../utils/functions";
import * as config from "../utils/config";
import Pool from "../models/pool";
import { verifyAlchemySignature, verifySignature } from "../utils/identity";
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount(
  "0x" + config.WALLET_SECRET
);

const webhookRouter = require("express").Router();

webhookRouter.post("/escrow", async (req, res) => {
  if (verifyAlchemySignature(req)) {
    const pools = await Pool.find({}).exec();
    const addrlist = pools.map((_) => _.address.toLowerCase());
    const { fromAddress, toAddress, value, asset, hash } = req.body.activity[0];

    // If the transaction is successfully sent from the wallet
    // Mark the listing as completed
    if (addrlist.includes(fromAddress.toLowerCase())) {
      try {
        await markListingAsCompleted(toAddress, hash, asset);
      } catch (error) {
        console.log(error);
        res.sendStatus(error);
      }
    } else {
      // Transaction is sent to the wallet
      try {
        const pool = await Pool.findOne({
          address: toAddress.toLowerCase(),
        }).exec();
        if (pool!.active && pool) {
          await processListing(pool.listing, value, asset, false);
          res.sendStatus(204);
        } else {
          console.log("sent to inactive pool");
          res.sendStatus(400);
        }
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
      await processListing(listing_id, null, null, true);
      res.sendStatus(204);
    } catch (error) {
      console.log(error);
      res.sendStatus(error);
    }
  }
});

export default webhookRouter;
