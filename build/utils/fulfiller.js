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
const listing_1 = __importDefault(require("../models/listing"));
const user_1 = __importDefault(require("../models/user"));
const axios_1 = __importDefault(require("axios"));
const proxy_1 = __importDefault(require("./proxy"));
const logger = require("./logger");
const Tx = require("ethereumjs-tx").Transaction;
const config = require("./config");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);
// const getListings = async () => {
//   let listings = await Listing.find({
//     ongoing: true,
//     escrow: { full: true },
//   }).exec();
//   return listings;
// };
const sendEth = (ethereumaddress, value, txnfee, nonce, gasprice) => __awaiter(void 0, void 0, void 0, function* () {
    let rawTx = {
        to: ethereumaddress,
        value: web3.utils.toHex(web3.utils.toWei((value - value * txnfee).toString(), "ether")),
        gasLimit: web3.utils.toHex(21000),
        gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString), "gwei"),
        nonce: web3.utils.toHex(nonce + 1),
    };
    let tx = new Tx(rawTx, { chain: "mainnet" });
    tx.sign(web3.utils.hexToBytes("0x" + config.SECRET));
    let serializedTx = tx.serialize();
    return web3.eth
        .sendSignedTransaction("0x" + serializedTx.toString("hex"))
        .then((hash) => {
        return hash;
    })
        .catch((error) => {
        throw error;
    });
});
const sendBitclout = (bitcloutpubkey, amountnanos, txnfee) => __awaiter(void 0, void 0, void 0, function* () {
    yield proxy_1.default.initiateSendBitclout(20, bitcloutpubkey, amountnanos - amountnanos * txnfee);
    return proxy_1.default
        .sendBitclout()
        .then((response) => {
        console.log(response);
        proxy_1.default.close();
        if (JSON.parse(response).TransactionIDBase58Check) {
            return JSON.parse(response).TransactionIDBase58Check;
        }
    })
        .catch((error) => {
        proxy_1.default.close();
        throw error;
    });
});
const fulfill = (listing_id) => __awaiter(void 0, void 0, void 0, function* () {
    let gas = yield axios_1.default.get("https://ethgasstation.info/json/ethgasAPI.json");
    let nonce = yield web3.eth.getTransactionCount(escrowWallet.address, "pending");
    let listing = yield listing_1.default.findOne({ _id: listing_id }).exec();
    if (listing) {
        let buyer = yield user_1.default.findOne({ _id: listing.buyer }).exec();
        let seller = yield user_1.default.findOne({ _id: listing.seller }).exec();
        if (buyer && seller) {
            yield sendEth(seller.ethereumaddress, listing.etheramount, 0.04, nonce, gas.data.average / 10)
                .then((hash) => {
                listing.finalTransactionId = hash;
            })
                .catch((error) => {
                logger.error(error);
            });
            yield sendBitclout(buyer.bitcloutpubkey, listing.bitcloutamount, 0.04)
                .then((id) => {
                listing.bitcloutTransactionId = id;
                seller.bitswapbalance -= listing.bitcloutamount;
            })
                .catch((error) => {
                logger.error(error);
            });
            buyer.buys.push(listing._id);
            buyer.completedtransactions += 1;
            seller.completedtransactions += 1;
            buyer.buystate = false;
            listing.ongoing = false;
            listing.completed = {
                status: true,
                date: new Date(),
            };
            yield listing.save();
            yield buyer.save();
            yield seller.save();
            return 1;
        }
        else {
            logger.error("Buyer/Seller not found");
            throw Error("Buyer/Seller not found");
        }
    }
    else {
        logger.error("Listing not found");
        throw Error("Listing not found");
    }
});
exports.default = fulfill;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsZmlsbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvZnVsZmlsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0VBQXdDO0FBQ3hDLDBEQUFrQztBQUNsQyxrREFBMEI7QUFDMUIsb0RBQTRCO0FBRTVCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ2hELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUM1RSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlFLG9DQUFvQztBQUNwQyx3Q0FBd0M7QUFDeEMscUJBQXFCO0FBQ3JCLDhCQUE4QjtBQUM5QixlQUFlO0FBQ2YscUJBQXFCO0FBQ3JCLEtBQUs7QUFFTCxNQUFNLE9BQU8sR0FBRyxDQUNkLGVBQXVCLEVBQ3ZCLEtBQWEsRUFDYixNQUFjLEVBQ2QsS0FBYSxFQUNiLFFBQWdCLEVBQ2hCLEVBQUU7SUFDRixJQUFJLEtBQUssR0FBRztRQUNWLEVBQUUsRUFBRSxlQUFlO1FBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLFFB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