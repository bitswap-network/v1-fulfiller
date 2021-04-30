"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const transaction_1 = __importDefault(require("../models/transaction"));
const fulfiller_1 = require("../utils/fulfiller");
const functions_1 = require("../utils/functions");
const config = __importStar(require("../utils/config"));
const identity_1 = require("../utils/identity");
const logger = require("../utils/logger");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.WALLET_SECRET);
const webhookRouter = require("express").Router();
webhookRouter.post("/escrow", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (identity_1.verifyAlchemySignature(req)) {
        const { fromAddress, toAddress, value, asset, hash } = req.body.activity[0];
        // If the transaction is sent to the wallet
        if (fromAddress.toLowerCase() === escrowWallet.address.toLowerCase()) {
            try {
                yield functions_1.markListingAsCompleted(toAddress, hash, asset);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(error);
            }
        }
        else {
            try {
                yield functions_1.processListing(fromAddress, value, asset);
                res.sendStatus(204);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(error);
            }
        }
    }
}));
webhookRouter.post("/withdraw", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (identity_1.verifySignature(req)) {
        const { username, txn_id } = req.body;
        const transaction = yield transaction_1.default.findOne({ _id: txn_id }).exec();
        const user = yield user_1.default.findOne({ username: username }).exec();
        if (transaction && user) {
            if (transaction.transactiontype == "withdraw" &&
                transaction.status == "pending") {
                let txnAmountFeesDeducted = transaction.bitcloutnanos - transaction.fees;
                fulfiller_1.sendBitclout(transaction.bitcloutpubkey, txnAmountFeesDeducted, 0)
                    .then((response) => {
                    let txnBase58 = response.data.TransactionIDBase58Check;
                    fulfiller_1.submitTransaction(response.data.TransactionHex)
                        .then((txnresponse) => {
                        console.log(txnresponse);
                        user.bitswapbalance -= transaction.bitcloutnanos / 1e9;
                        transaction.status = "completed";
                        transaction.completed = new Date();
                        transaction.tx_id = txnBase58;
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
    }
    else {
        res.status(403).send("unauthorized request");
    }
}));
exports.default = webhookRouter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViaG9vay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2NvbnRyb2xsZXJzL3dlYmhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQWtDO0FBRWxDLHdFQUFnRDtBQUNoRCxrREFBcUU7QUFDckUsa0RBQTRFO0FBRTVFLHdEQUEwQztBQUMxQyxnREFBNEU7QUFFNUUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDNUUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQ3hELElBQUksR0FBRyxNQUFNLENBQUMsYUFBYSxDQUM1QixDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWxELGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQU8sR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO0lBQy9DLElBQUksaUNBQXNCLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDL0IsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1RSwyQ0FBMkM7UUFDM0MsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLEtBQUssWUFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNwRSxJQUFJO2dCQUNG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