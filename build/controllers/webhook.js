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
const fulfiller_1 = __importDefault(require("../utils/fulfiller"));
const Web3 = require("web3");
const webhookRouter = require("express").Router();
const config = require("../utils/config");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
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
                            fulfiller_1.default(listing._id);
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
exports.default = webhookRouter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViaG9vay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2NvbnRyb2xsZXJzL3dlYmhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsZ0VBQXdDO0FBQ3hDLG1FQUF5QztBQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2xELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzFDLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFFNUUsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBTyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFDL0MsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNyQixNQUFNLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMvQyxNQUFNLEtBQUssR0FBRyxNQUFNLGNBQUksQ0FBQyxPQUFPLENBQUM7WUFDL0IsZUFBZSxFQUFFLFdBQVcsQ0FBQyxXQUFXLEVBQUU7U0FDM0MsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQU8sUUFBUSxFQUFFLEVBQUU7WUFDcEQsSUFBSSxRQUFRLElBQUksS0FBSyxJQUFJLEtBQUssRUFBRTtnQkFDOUIsSUFBSSxLQUFLLEVBQUU7b0JBQ1QsTUFBTSxPQUFPLEdBQUcsTUFBTSxpQkFBTyxDQUFDLE9BQU8sQ0FBQzt3QkFDcEMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHO3FCQUNqQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ1YsSUFBSSxPQUFPLEVBQUU7d0JBQ1gsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRTs0QkFDaEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDOzRCQUNoQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7NEJBQzNCLG1CQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUN0Qjs2QkFBTTs0QkFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO3lCQUM1QztxQkFDRjt5QkFBTTt3QkFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO3FCQUMvQztpQkFDRjtxQkFBTTtvQkFDTCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2lCQUN6QzthQUNGO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7YUFDNUM7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0tBQ0o7U0FBTTtRQUNMLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7S0FDekM7QUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUgsa0JBQWUsYUFBYSxDQUFDIn0=