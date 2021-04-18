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
exports.sendEth = exports.sendBitclout = exports.fulfill = void 0;
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
const sendEth = (ethereumaddress, value, txnfee, nonce, gasprice) => __awaiter(void 0, void 0, void 0, function* () {
    let rawTx = {
        to: ethereumaddress,
        value: web3.utils.toHex(web3.utils.toWei((value - value * txnfee).toString(), "ether")),
        gasLimit: web3.utils.toHex(21000),
        gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString), "gwei"),
        nonce: web3.utils.toHex(nonce + 1),
    };
    let tx = new Tx(rawTx, { chain: "kovan" });
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
exports.sendEth = sendEth;
const sendBitclout = (bitcloutpubkey, amountnanos, txnfee) => __awaiter(void 0, void 0, void 0, function* () {
    let proxy = new proxy_1.default();
    yield proxy.initiateSendBitclout(20, bitcloutpubkey, amountnanos - amountnanos * txnfee);
    return proxy
        .sendBitclout()
        .then((response) => {
        // console.log(response);
        proxy.close();
        if (JSON.parse(response).TransactionIDBase58Check) {
            return JSON.parse(response).TransactionIDBase58Check;
        }
    })
        .catch((error) => {
        proxy.close();
        throw error;
    });
});
exports.sendBitclout = sendBitclout;
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
            yield sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, 0.04)
                .then((id) => {
                listing.bitcloutTransactionId = id;
                seller.bitswapbalance -= listing.bitcloutnanos;
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
exports.fulfill = fulfill;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsZmlsbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvZnVsZmlsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdFQUF3QztBQUN4QywwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUU1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUNoRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDNUUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUU5RSxNQUFNLE9BQU8sR0FBRyxDQUNkLGVBQXVCLEVBQ3ZCLEtBQWEsRUFDYixNQUFjLEVBQ2QsS0FBYSxFQUNiLFFBQWdCLEVBQ2hCLEVBQUU7SUFDRixJQUFJLEtBQUssR0FBRztRQUNWLEVBQUUsRUFBRSxlQUFlO1FBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUMvRDtRQUNELFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7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