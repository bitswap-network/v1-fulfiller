"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = __importDefault(require("../models/user"));
const listing_1 = __importDefault(require("../models/listing"));
const transaction_1 = __importDefault(require("../models/transaction"));
const fulfiller_1 = require("../utils/fulfiller");
const axios_1 = __importDefault(require("axios"));
const config = require("../utils/config");
const logger = require("../utils/logger");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);
const webhookRouter = require("express").Router();
// const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
// const { tokenAuthenticator } = require("../utils/middleware");
const crypto_1 = require("crypto");
function isValidSignature(request) {
  const token = "MgB1ZnvEyupXi_7VRMT3wUOkfaKV0d1z";
  const headers = request.headers;
  const signature = headers["x-alchemy-signature"]; // Lowercase for NodeJS
  const body = request.body;
  const hmac = crypto_1.createHmac("sha256", token); // Create a HMAC SHA256 hash using the auth token
  hmac.update(JSON.stringify(body), "utf8");
  const digest = hmac.digest("hex");
  console.log(signature, digest);
  return signature == digest; // If signature equals your computed hash, return true
}
webhookRouter.post("/escrow", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // if (isValidSignature(req)) {
    if (req.body.activity) {
      const { fromAddress, value, asset, hash } = req.body.activity[0];
      console.log(req.body.activity[0], fromAddress);
      const buyer = yield user_1.default
        .findOne({
          ethereumaddress: fromAddress.toLowerCase(),
        })
        .exec();
      console.log(buyer);
      if (asset == "ETH") {
        if (buyer) {
          const listing = yield listing_1.default
            .findOne({
              buyer: buyer._id,
              ongoing: true,
            })
            .exec();
          console.log(listing);
          if (listing && !listing.completed.status) {
            if (value >= listing.etheramount) {
              listing.escrow.balance += value;
              listing.escrow.full = true;
              listing.save((err) => {
                if (err) {
                  console.log(err);
                  res.status(500).send("error saving listing");
                } else {
                  fulfiller_1.fulfill(listing._id);
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
    // } else {
    //   console.log("unauthorized request");
    //   res.status(400).send("unauthorized request");
    // }
  })
);
webhookRouter.post("/fulfillretry", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const gas = yield axios_1.default.get(
      "https://ethgasstation.info/json/ethgasAPI.json"
    );
    const nonce = yield web3.eth.getTransactionCount(
      escrowWallet.address,
      "pending"
    );
    const { listing_id } = req.body;
    const listing = yield listing_1.default
      .findOne({
        _id: listing_id,
        ongoing: true,
      })
      .exec();
    if (listing) {
      const buyer = yield user_1.default.findOne({ _id: listing.buyer }).exec();
      const seller = yield user_1.default
        .findOne({ _id: listing.seller })
        .exec();
      if (buyer && seller) {
        if (listing.escrow.full && !listing.completed.status) {
          if (!listing.escrowsent) {
            yield fulfiller_1
              .sendEth(
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
            yield fulfiller_1
              .sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, 0.04)
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
  })
);
webhookRouter.post("/withdraw", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { username, txn_id } = req.body;
    const transaction = yield transaction_1.default
      .findOne({ _id: txn_id })
      .exec();
    const user = yield user_1.default.findOne({ username: username }).exec();
    if (transaction && user) {
      if (
        transaction.transactiontype == "withdraw" &&
        transaction.status == "pending"
      ) {
        fulfiller_1
          .sendBitclout(
            transaction.bitcloutpubkey,
            transaction.bitcloutnanos,
            0
          )
          .then((response) => {
            console.log(response);
            fulfiller_1
              .submitTransaction(response.data.TransactionHex)
              .then((txnresponse) => {
                console.log(txnresponse);
                user.bitswapbalance -= transaction.bitcloutnanos / 1e9;
                transaction.status = "completed";
                transaction.completed = new Date();
                transaction.tx_id = txnresponse.data.TxnHashHex;
                transaction.save((err) => {
                  if (err) {
                    console.log(err);
                    res.status(500).send("txn failed to save");
                  } else {
                    user.save((err) => {
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
  })
);
exports.default = webhookRouter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViaG9vay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2NvbnRyb2xsZXJzL3dlYmhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsZ0VBQXdDO0FBQ3hDLHdFQUFnRDtBQUNoRCxrREFLNEI7QUFDNUIsa0RBQTBCO0FBQzFCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzFDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzFDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUUsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWxELCtFQUErRTtBQUMvRSxpRUFBaUU7QUFDakUsbUNBQW9DO0FBQ3BDLFNBQVMsZ0JBQWdCLENBQUMsT0FBTztJQUMvQixNQUFNLEtBQUssR0FBRyxrQ0FBa0MsQ0FBQztJQUNqRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ2hDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO0lBQ3pFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDMUIsTUFBTSxJQUFJLEdBQUcsbUJBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxpREFBaUQ7SUFDM0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0IsT0FBTyxTQUFTLElBQUksTUFBTSxDQUFDLENBQUMsc0RBQXNEO0FBQ3BGLENBQUM7QUFDRCxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFPLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUMvQywrQkFBK0I7SUFDL0IsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNyQixNQUFNLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMvQyxNQUFNLEtBQUssR0FBRyxNQUFNLGNBQUksQ0FBQyxPQUFPLENBQUM7WUFDL0IsZUFBZSxFQUFFLFdBQVcsQ0FBQyxXQUFXLEVBQUU7U0FDM0MsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQixJQUFJLEtBQUssSUFBSSxLQUFLLEVBQUU7WUFDbEIsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsTUFBTSxPQUFPLEdBQUcsTUFBTSxpQkFBTyxDQUFDLE9BQU8sQ0FBQztvQkFDcEMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHO29CQUNoQixPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDckIsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtvQkFDeEMsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRTt3QkFDaEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDO3dCQUNoQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7d0JBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFRLEVBQUUsRUFBRTs0QkFDeEIsSUFBSSxHQUFHLEVBQUU7Z0NBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDakIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQzs2QkFDOUM7aUNBQU07Z0NBQ0wsbUJBQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ3JCLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7NkJBQ3JCO3dCQUNILENBQUMsQ0FBQyxDQUFDO3FCQUNKO3lCQUFNO3dCQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQzt3QkFDbEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztxQkFDNUM7aUJBQ0Y7cUJBQU07b0JBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUNoQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2lCQUMvQzthQUNGO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDL0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQzthQUN6QztTQUNGO2FBQU07WUFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDbEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztTQUM1QztRQUNELE1BQU07S0FDUDtTQUFNO1FBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9CLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7S0FDekM7SUFDRCxXQUFXO0lBQ1gseUNBQXlDO0lBQ3pDLGtEQUFrRDtJQUNsRCxJQUFJO0FBQ04sQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNILGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQU8sR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO0lBQ3JELE1BQU0sR0FBRyxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO0lBQzlFLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FDOUMsWUFBWSxDQUFDLE9BQU8sRUFDcEIsU0FBUyxDQUNWLENBQUM7SUFDRixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztJQUNoQyxNQUFNLE9BQU8sR0FBRyxNQUFNLGlCQUFPLENBQUMsT0FBTyxDQUFDO1FBQ3BDLEdBQUcsRUFBRSxVQUFVO1FBQ2YsT0FBTyxFQUFFLElBQUk7S0FDZCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDVixJQUFJLE9BQU8sRUFBRTtRQUNYLE1BQU0sS0FBSyxHQUFHLE1BQU0sY0FBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoRSxNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEUsSUFBSSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQ25CLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtnQkFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7b0JBQ3ZCLE1BQU0sbUJBQU8sQ0FDWCxNQUFNLENBQUMsZUFBZSxFQUN0QixPQUFPLENBQUMsV0FBVyxFQUNuQixDQUFDLEVBQ0QsS0FBSyxFQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FDdEI7eUJBQ0UsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7d0JBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDcEIsT0FBTyxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUM7d0JBQ3BELE9BQU8sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO3dCQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO3dCQUMzQixJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUU7NEJBQ3hCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDN0IsS0FBSyxDQUFDLHFCQUFxQixJQUFJLENBQUMsQ0FBQzs0QkFDakMsTUFBTSxDQUFDLHFCQUFxQixJQUFJLENBQUMsQ0FBQzs0QkFDbEMsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7NEJBQ3ZCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDOzRCQUN4QixPQUFPLENBQUMsU0FBUyxHQUFHO2dDQUNsQixNQUFNLEVBQUUsSUFBSTtnQ0FDWixJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7NkJBQ2pCLENBQUM7NEJBQ0YsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzt5QkFDckI7d0JBQ0QsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNmLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDYixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2hCLENBQUMsQ0FBQzt5QkFDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTt3QkFDZixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO3dCQUNuRCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN0QixDQUFDLENBQUMsQ0FBQztpQkFDTjtnQkFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRTtvQkFDekIsTUFBTSx3QkFBWSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUM7eUJBQ2xFLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO3dCQUNqQixPQUFPLENBQUMscUJBQXFCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7d0JBQ3pELE9BQU8sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO3dCQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO3dCQUM3QixJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7NEJBQ3RCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDN0IsS0FBSyxDQUFDLHFCQUFxQixJQUFJLENBQUMsQ0FBQzs0QkFDakMsTUFBTSxDQUFDLHFCQUFxQixJQUFJLENBQUMsQ0FBQzs0QkFDbEMsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7NEJBQ3ZCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDOzRCQUN4QixPQUFPLENBQUMsU0FBUyxHQUFHO2dDQUNsQixNQUFNLEVBQUUsSUFBSTtnQ0FDWixJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7NkJBQ2pCLENBQUM7NEJBQ0YsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzt5QkFDckI7d0JBQ0QsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNmLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDYixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2hCLENBQUMsQ0FBQzt5QkFDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTt3QkFDZixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO3dCQUNyRCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN0QixDQUFDLENBQUMsQ0FBQztpQkFDTjthQUNGO1NBQ0Y7YUFBTTtZQUNMLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7U0FDbkQ7S0FDRjtTQUFNO1FBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztLQUMzQztBQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFSCxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFPLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUNqRCxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDdEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxxQkFBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RFLE1BQU0sSUFBSSxHQUFHLE1BQU0sY0FBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9ELElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtRQUN2QixJQUNFLFdBQVcsQ0FBQyxlQUFlLElBQUksVUFBVTtZQUN6QyxXQUFXLENBQUMsTUFBTSxJQUFJLFNBQVMsRUFDL0I7WUFDQSx3QkFBWSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7aUJBQ25FLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0Qiw2QkFBaUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztxQkFDNUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7b0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxjQUFjLElBQUksV0FBVyxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUM7b0JBQ3ZELFdBQVcsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO29CQUNqQyxXQUFXLENBQUMsU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ25DLFdBQVcsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7b0JBQ2hELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFRLEVBQUUsRUFBRTt3QkFDNUIsSUFBSSxHQUFHLEVBQUU7NEJBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDakIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQzt5QkFDNUM7NkJBQU07NEJBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQVEsRUFBRSxFQUFFO2dDQUNyQixJQUFJLEdBQUcsRUFBRTtvQ0FDUCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29DQUNqQixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2lDQUM3QztxQ0FBTTtvQ0FDTCxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lDQUNyQjs0QkFDSCxDQUFDLENBQUMsQ0FBQzt5QkFDSjtvQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUM7cUJBQ0QsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQzdCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM5QixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQztpQkFDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDZixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDN0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUIsQ0FBQyxDQUFDLENBQUM7U0FDTjthQUFNO1lBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDckM7S0FDRjtTQUFNO1FBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztLQUM1QztBQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFSCxrQkFBZSxhQUFhLENBQUMifQ==
