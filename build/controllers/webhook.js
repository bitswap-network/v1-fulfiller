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
const Web3 = require("web3");
const webhookRouter = require("express").Router();
const config = require("../utils/config");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const { tokenAuthenticator } = require("../utils/middleware");
webhookRouter.post("/escrow", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.body.activity) {
        const { fromAddress, value, asset, hash } = req.body.activity[0];
        console.log(req.body.activity[0], fromAddress);
        const buyer = yield user_1.default.findOne({
            ethereumaddress: fromAddress.toLowerCase(),
        });
        web3.eth.getTransaction(hash).then((response) => __awaiter(void 0, void 0, void 0, function* () {
            if (response && asset == "ETH") {
                if (buyer) {
                    const listing = yield listing_1.default.findOne({
                        buyer: buyer._id,
                    }).exec();
                    if (listing) {
                        if (value >= listing.etheramount) {
                            listing.escrow.balance += value;
                            listing.escrow.full = true;
                            fulfiller_1.fulfill(listing._id);
                        }
                        else {
                            res.status(400).send("insufficient funds");
                        }
                    }
                    else {
                        res.status(400).send("no associated listing");
                    }
                }
                else {
                    res.status(400).send("buyer not found");
                }
            }
            else {
                res.status(400).send("txn hash not valid");
            }
        }));
    }
    else {
        res.status(400).send("invalid request");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViaG9vay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2NvbnRyb2xsZXJzL3dlYmhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsZ0VBQXdDO0FBQ3hDLHdFQUFnRDtBQUNoRCxrREFBMkQ7QUFDM0QsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNsRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMxQyxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBRTlELGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQU8sR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO0lBQy9DLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDckIsTUFBTSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0MsTUFBTSxLQUFLLEdBQUcsTUFBTSxjQUFJLENBQUMsT0FBTyxDQUFDO1lBQy9CLGVBQWUsRUFBRSxXQUFXLENBQUMsV0FBVyxFQUFFO1NBQzNDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFPLFFBQVEsRUFBRSxFQUFFO1lBQ3BELElBQUksUUFBUSxJQUFJLEtBQUssSUFBSSxLQUFLLEVBQUU7Z0JBQzlCLElBQUksS0FBSyxFQUFFO29CQUNULE1BQU0sT0FBTyxHQUFHLE1BQU0saUJBQU8sQ0FBQyxPQUFPLENBQUM7d0JBQ3BDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRztxQkFDakIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNWLElBQUksT0FBTyxFQUFFO3dCQUNYLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUU7NEJBQ2hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQzs0QkFDaEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDOzRCQUMzQixtQkFBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt5QkFDdEI7NkJBQU07NEJBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQzt5QkFDNUM7cUJBQ0Y7eUJBQU07d0JBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztxQkFDL0M7aUJBQ0Y7cUJBQU07b0JBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztpQkFDekM7YUFDRjtpQkFBTTtnQkFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2FBQzVDO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztLQUNKO1NBQU07UUFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0tBQ3pDO0FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQU8sR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO0lBQ2pELE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztJQUN0QyxNQUFNLFdBQVcsR0FBRyxNQUFNLHFCQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxjQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0QsSUFBSSxXQUFXLElBQUksSUFBSSxFQUFFO1FBQ3ZCLElBQ0UsV0FBVyxDQUFDLGVBQWUsSUFBSSxVQUFVO1lBQ3pDLFdBQVcsQ0FBQyxNQUFNLElBQUksU0FBUyxFQUMvQjtZQUNBLHdCQUFZLENBQUMsV0FBWSxDQUFDLGNBQWMsRUFBRSxXQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztpQkFDckUsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ2pCLHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGNBQWMsSUFBSSxXQUFXLENBQUMsYUFBYSxDQUFDO2dCQUNqRCxXQUFXLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQztnQkFDakMsV0FBVyxDQUFDLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNuQyxXQUFXLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztnQkFDN0IsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQVEsRUFBRSxFQUFFO29CQUM1QixJQUFJLEdBQUcsRUFBRTt3QkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNqQixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO3FCQUM1Qzt5QkFBTTt3QkFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBUSxFQUFFLEVBQUU7NEJBQ3JCLElBQUksR0FBRyxFQUFFO2dDQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ2pCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7NkJBQzdDO2lDQUFNO2dDQUNMLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7NkJBQ3JCO3dCQUNILENBQUMsQ0FBQyxDQUFDO3FCQUNKO2dCQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDO2lCQUNELEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM3QixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5QixDQUFDLENBQUMsQ0FBQztTQUNOO2FBQU07WUFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNyQztLQUNGO1NBQU07UUFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0tBQzVDO0FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILGtCQUFlLGFBQWEsQ0FBQyJ9