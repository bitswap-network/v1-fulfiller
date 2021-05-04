import { verifySignature } from "../utils/identity";
import Transaction from "../models/transaction";
import User from "../models/user";
import Pool from "../models/pool";
import { poolDoc } from "../models/pool";
import * as config from "../utils/config";
import { sendBitclout, submitTransaction } from "../utils/fulfiller";
import {
  encryptAddress,
  decryptAddress,
  addAddressWebhook,
} from "../utils/functions";
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));

const coreRouter = require("express").Router();

coreRouter.post("/addAccount", async (req, res) => {
  if (verifySignature(req)) {
    const { priv, rank } = req.body;
    let prefix = priv.substring(0, 1);
    let key;
    if (prefix === "0x") {
      key = priv;
    } else {
      key = "0x" + priv;
    }
    const wallet = await web3.eth.accounts.privateKeyToAccount(key);
    const balance = await web3.eth.getBalance(wallet.address);
    const pool = new Pool({
      address: wallet.address,
      privateKey: encryptAddress(key),
      balance: balance / 1e18,
      super: rank,
    });
    try {
      await addAddressWebhook([wallet.address]);
      await pool.save();
      res.status(200).send(pool);
    } catch (e) {
      res.status(500).send(e);
    }
  } else {
    res.sendStatus(403);
  }
});

coreRouter.post("/initAccounts", (req, res) => {
  if (verifySignature(req)) {
    const { num, rank } = req.body;
    var poollist: poolDoc[] = [];
    var addrlist: string[] = [];
    for (let i = 0; i < num; i++) {
      let account = web3.eth.accounts.create();
      let pool = new Pool({
        address: account.address.toLowerCase(),
        privateKey: encryptAddress(account.privateKey),
        super: parseInt(rank),
      });
      pool.save((err: any) => {
        if (err) {
          console.log(err);
          res.status(500).send(err);
        } else {
          addrlist.push(account.address);
          poollist.push(pool);
          console.log(
            "New Address Created: ",
            account.address,
            " Rank: ",
            rank
          );
        }
        if (i === num - 1) {
          addAddressWebhook(addrlist)
            .then(() => {
              res.send(poollist);
            })
            .catch((e) => {
              console.log(e);
              res.status(500).send(e);
            });
        }
      });
    }
  } else {
    res.sendStatus(403);
  }
});

coreRouter.post("/withdraw", async (req, res) => {
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
export default coreRouter;
