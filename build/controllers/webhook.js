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
                    yield fulfiller_1.sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, 0.04)
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