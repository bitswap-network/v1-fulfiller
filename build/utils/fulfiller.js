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
const EthereumTx = require("ethereumjs-tx").Transaction;
const logger = require("./logger");
// const Tx = require("ethereumjs-tx").Transaction;
const config = require("./config");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("https://eth-kovan.alchemyapi.io/v2/6LTFWvCzuUcuhZTbuX4N9wnHkS4dwbQQ"));
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);
const sendEth = (ethereumaddress, value, txnfee, nonce, gasprice) => {
    let rawTx = {
        to: ethereumaddress,
        from: escrowWallet.address,
        value: web3.utils.toHex(web3.utils.toWei((value - value * txnfee).toString())),
        gasLimit: web3.utils.toHex(21000),
        gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString(), "gwei")),
        nonce: web3.utils.toHex(nonce),
    };
    console.log(rawTx, escrowWallet, gasprice, nonce);
    const transaction = new EthereumTx(rawTx, {
        chain: "kovan",
    });
    transaction.sign(web3.utils.hexToBytes(escrowWallet.privateKey));
    const serializedTransaction = transaction.serialize();
    return web3.eth.sendSignedTransaction("0x" + serializedTransaction.toString("hex"));
};
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
                listing.bitcloutsent = true;
                logger.info("bitclout sent");
                sendEth(seller.ethereumaddress, listing.etheramount, 0.04, nonce, gas.data.average / 10)
                    .then((result) => {
                    listing.finalTransactionId = result.transactionHash;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsZmlsbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvZnVsZmlsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdFQUF3QztBQUN4QywwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUU1QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDO0FBRXhELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuQyxtREFBbUQ7QUFDbkQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FDbkIsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FDN0IscUVBQXFFLENBQ3RFLENBQ0YsQ0FBQztBQUNGLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFFOUUsTUFBTSxPQUFPLEdBQUcsQ0FDZCxlQUF1QixFQUN2QixLQUFhLEVBQ2IsTUFBYyxFQUNkLEtBQWEsRUFDYixRQUFnQixFQUNoQixFQUFFO0lBQ0YsSUFBSSxLQUFLLEdBQUc7UUFDVixFQUFFLEVBQUUsZUFBZTtRQUNuQixJQUFJLEVBQUUsWUFBWSxDQUFDLE9BQU87UUFDMUIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDdEQ7UUFDRCxRQUFRLEVBQUUsSUFBSSxDQUFDLEtB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