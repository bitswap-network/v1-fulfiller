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
        gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString()), "gwei"),
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
    const gas = yield axios_1.default.get("https://ethgasstation.info/json/ethgasAPI.json");
    // console.log(gas);
    const nonce = yield web3.eth.getTransactionCount(escrowWallet.address, "pending");
    const listing = yield listing_1.default.findOne({ _id: listing_id }).exec();
    if (listing) {
        const buyer = yield user_1.default.findOne({ _id: listing.buyer }).exec();
        const seller = yield user_1.default.findOne({ _id: listing.seller }).exec();
        if (buyer && seller) {
            sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, 0.04)
                .then((id) => {
                listing.bitcloutTransactionId = id;
                seller.bitswapbalance -= listing.bitcloutnanos;
                listing.bitcloutsent = true;
                logger.info("bitclout sent");
                sendEth(seller.ethereumaddress, listing.etheramount, 0.04, nonce, gas.data.average / 10)
                    .then((hash) => {
                    listing.finalTransactionId = hash;
                    listing.escrowsent = true;
                    buyer.buys.push(listing._id);
                    buyer.completedtransactions += 1;
                    seller.completedtransactions += 1;
                    buyer.buystate = false;
                    listing.ongoing = false;
                    listing.completed = {
                        status: true,
                        date: new Date(),
                    };
                    listing.save();
                    buyer.save();
                    seller.save();
                })
                    .catch((error) => {
                    logger.error(error);
                });
            })
                .catch((error) => {
                logger.error(error);
            });
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