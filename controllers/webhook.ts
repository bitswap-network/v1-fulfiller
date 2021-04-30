import { processListing, markListingAsCompleted } from "../utils/functions";
import * as config from "../utils/config";
import { verifyAlchemySignature } from "../utils/identity";

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
        console.log(error);
        res.sendStatus(error);
      }
    } else {
      try {
        await processListing(fromAddress, value, asset);
        res.sendStatus(204);
      } catch (error) {
        console.log(error);
        res.sendStatus(error);
      }
    }
  }
});

export default webhookRouter;
