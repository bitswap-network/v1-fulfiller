import User from "../models/user";
import Listing from "../models/listing";
import fulfill from "../utils/fulfiller";
const Web3 = require("web3");
const webhookRouter = require("express").Router();
const config = require("../utils/config");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));

webhookRouter.post("/escrow", async (req, res) => {
  if (req.body.activity) {
    const { fromAddress, value, asset, hash } = req.body.activity[0];
    console.log(req.body.activity[0], fromAddress);
    const buyer = await User.findOne({
      ethereumaddress: fromAddress.toLowerCase(),
    });
    web3.eth.getTransaction(hash).then(async (response) => {
      if (response && asset == "ETH") {
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
    });
  } else {
    res.status(400).send("invalid request");
  }
});

export default webhookRouter;
