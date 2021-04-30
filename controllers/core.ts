import { verifySignature } from "../utils/identity";
import Transaction from "../models/transaction";
import User from "../models/user";
import { sendBitclout, submitTransaction } from "../utils/fulfiller";

const coreRouter = require("express").Router();

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
