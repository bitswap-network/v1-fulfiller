"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
webhookRouter.post("/escrow", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (isValidSignature(req)) {
        if (req.body.activity) {
            const { fromAddress, value, asset, hash } = req.body.activity[0];
            console.log(req.body.activity[0], fromAddress);
            const buyer = yield user_1.default.findOne({
                ethereumaddress: fromAddress.toLowerCase(),
            }).exec();
            console.log(buyer);
            if (asset == "ETH") {
                if (buyer) {
                    const listing = yield listing_1.default.findOne({
                        buyer: buyer._id,
                        ongoing: true,
                    }).exec();
                    console.log(listing);
                    if (listing && !listing.completed.status) {
                        if (value >= listing.etheramount) {
                            listing.escrow.balance += value;
                            listing.escrow.full = true;
                            listing.save((err) => {
                                if (err) {
                                    console.log(err);
                                    res.status(500).send("error saving listing");
                                }
                                else {
                                    fulfiller_1.fulfill(listing._id);
                                    res.sendStatus(200);
                                }
                            });
                        }
                        else {
                            console.log("insufficient funds");
                            res.status(400).send("insufficient funds");
                        }
                    }
                    else {
                        console.log("no listing found");
                        res.status(400).send("no associated listing");
                    }
                }
                else {
                    console.log("buyer not found");
                    res.status(400).send("buyer not found");
                }
            }
            else {
                console.log("txn type not valid");
                res.status(400).send("txn type not valid");
            }
            // });
        }
        else {
            console.log("invalid request");
            res.status(400).send("invalid request");
        }
    }
    else {
        console.log("unauthorized request");
        res.status(400).send("unauthorized request");
    }
}));
webhookRouter.post("/fulfillretry", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const gas = yield axios_1.default.get("https://ethgasstation.info/json/ethgasAPI.json");
    const nonce = yield web3.eth.getTransactionCount(escrowWallet.address, "pending");
    const { listing_id } = req.body;
    const listing = yield listing_1.default.findOne({
        _id: listing_id,
        ongoing: true,
    }).exec();
    if (listing) {
        const buyer = yield user_1.default.findOne({ _id: listing.buyer }).exec();
        const seller = yield user_1.default.findOne({ _id: listing.seller }).exec();
        if (buyer && seller) {
            if (listing.escrow.full && !listing.completed.status) {
                if (!listing.escrowsent) {
                    yield fulfiller_1.sendEth(seller.ethereumaddress, listing.etheramount, 0.04, nonce, gas.data.average / 10)
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
                        }
                        listing.save();
                        buyer.save();
                        seller.save();
                    })
                        .catch((error) => {
                        logger.error(error);
                    });
                }
                if (!listing.bitcloutsent) {
                    fulfiller_1.sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, 0.04)
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
                        }
                        listing.save();
                        buyer.save();
                        seller.save();
                    })
                        .catch((error) => {
                        logger.error(error);
                    });
                }
            }
        }
        else {
            res.status(400).send("buyer or seller not found");
        }
    }
    else {
        res.status(400).send("listing not found");
    }
}));
webhookRouter.post("/withdraw", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, txn_id } = req.body;
    const transaction = yield transaction_1.default.findOne({ _id: txn_id }).exec();
    const user = yield user_1.default.findOne({ username: username }).exec();
    if (transaction && user) {
        if (transaction.transactiontype == "withdraw" &&
            transaction.status == "pending") {
            fulfiller_1.sendBitclout(transaction.bitcloutpubkey, transaction.bitcloutnanos, 0)
                .then((response) => {
                // let resjson = JSON.parse(response);
                console.log(response);
                user.bitswapbalance -= transaction.bitcloutnanos;
                transaction.status = "completed";
                transaction.completed = new Date();
                transaction.tx_id = response;
                transaction.save((err) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send("txn failed to save");
                    }
                    else {
                        user.save((err) => {
                            if (err) {
                                console.log(err);
                                res.status(500).send("user failed to save");
                            }
                            else {
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
        }
        else {
            res.status(500).send("invalid txn");
        }
    }
    else {
        res.status(500).send("txn/user not found");
    }
}));
exports.default = webhookRouter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViaG9vay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2NvbnRyb2xsZXJzL3dlYmhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsZ0VBQXdDO0FBQ3hDLHdFQUFnRDtBQUNoRCxrREFBb0U7QUFDcEUsa0RBQTBCO0FBQzFCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzFDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzFDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUUsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWxELCtFQUErRTtBQUMvRSxpRUFBaUU7QUFDakUsbUNBQW9DO0FBQ3BDLFNBQVMsZ0JBQWdCLENBQUMsT0FBTztJQUMvQixNQUFNLEtBQUssR0FBRyxrQ0FBa0MsQ0FBQztJQUNqRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ2hDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO0lBQ3pFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDMUIsTUFBTSxJQUFJLEdBQUcsbUJBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxp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