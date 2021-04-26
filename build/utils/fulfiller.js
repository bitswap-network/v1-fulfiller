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
exports.submitTransaction = exports.sendEth = exports.sendBitclout = exports.fulfill = void 0;
const listing_1 = __importDefault(require("../models/listing"));
const user_1 = __importDefault(require("../models/user"));
const axios_1 = __importDefault(require("axios"));
const identity_1 = require("./identity");
const EthereumTx = require("ethereumjs-tx").Transaction;
const logger = require("./logger");
const config = __importStar(require("./config"));
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const fee = 0;
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.KEY);
console.log(config);
const sendEth = (ethereumaddress, value, txnfee, nonce, gasprice) => {
    let rawTx = {
        to: ethereumaddress,
        from: escrowWallet.address,
        value: web3.utils.toHex(web3.utils.toWei((value - value * txnfee - (21000 * gasprice) / 1e9).toString())),
        gasLimit: web3.utils.toHex(21000),
        gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString(), "gwei")),
        nonce: web3.utils.toHex(nonce),
    };
    console.log(rawTx, escrowWallet, gasprice, nonce);
    const transaction = new EthereumTx(rawTx, {
        chain: "mainnet",
    });
    transaction.sign(web3.utils.hexToBytes(escrowWallet.privateKey));
    const serializedTransaction = transaction.serialize();
    return web3.eth.sendSignedTransaction("0x" + serializedTransaction.toString("hex"));
};
exports.sendEth = sendEth;
const sendBitclout = (bitcloutpubkey, amountnanos, txnfee) => {
    console.log("sending bclt");
    return axios_1.default.post("https://api.bitclout.com/send-bitclout", JSON.stringify({
        AmountNanos: amountnanos,
        MinFeeRateNanosPerKB: 1000,
        RecipientPublicKeyOrUsername: bitcloutpubkey,
        SenderPublicKeyBase58Check: config.PUBLIC_KEY,
    }), {
        headers: {
            "Content-Type": "application/json",
            Cookie: "__cfduid=d0e96960ab7b9233d869e566cddde2b311619467183; INGRESSCOOKIE=e663da5b29ea8969365c1794da20771c",
        },
    });
};
exports.sendBitclout = sendBitclout;
const submitTransaction = (txnhex) => __awaiter(void 0, void 0, void 0, function* () {
    const signedTxn = identity_1.handleSign({
        encryptedSeedHex: config.ENCRYPTEDSEEDHEX,
        transactionHex: txnhex,
    });
    console.log("submitting txn");
    return axios_1.default.post("https://api.bitclout.com/submit-transaction", JSON.stringify({
        TransactionHex: signedTxn.signedTransactionHex,
    }), {
        headers: {
            "Content-Type": "application/json",
            Cookie: "__cfduid=d0e96960ab7b9233d869e566cddde2b311619467183; INGRESSCOOKIE=e663da5b29ea8969365c1794da20771c",
        },
    });
});
exports.submitTransaction = submitTransaction;
const fulfill = (listing_id) => __awaiter(void 0, void 0, void 0, function* () {
    const gas = yield axios_1.default.get("https://ethgasstation.info/json/ethgasAPI.json");
    // console.log(gas);
    const nonce = yield web3.eth.getTransactionCount(escrowWallet.address, "pending");
    const listing = yield listing_1.default.findOne({ _id: listing_id }).exec();
    if (listing) {
        const buyer = yield user_1.default.findOne({ _id: listing.buyer }).exec();
        const seller = yield user_1.default.findOne({ _id: listing.seller }).exec();
        if (buyer && seller) {
            yield sendBitclout(buyer.bitcloutpubkey, listing.bitcloutnanos, fee)
                .then((response) => {
                listing.bitcloutTransactionId = response.data.TxnHashHex;
                listing.bitcloutsent = true;
                logger.info("bitclout sent");
                sendEth(seller.ethereumaddress, listing.etheramount, fee, nonce, gas.data.average / 10)
                    .then((result) => {
                    listing.finalTransactionId = result.transactionHash;
                    listing.escrowsent = true;
                    // buyer.buys.push(listing._id);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsZmlsbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvZnVsZmlsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnRUFBd0M7QUFDeEMsMERBQWtDO0FBQ2xDLGtEQUEwQjtBQUcxQix5Q0FBd0M7QUFDeEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUV4RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsaURBQW1DO0FBQ25DLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNkLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFFOUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUVwQixNQUFNLE9BQU8sR0FBRyxDQUNkLGVBQXVCLEVBQ3ZCLEtBQWEsRUFDYixNQUFjLEVBQ2QsS0FBYSxFQUNiLFFBQWdCLEVBQ2hCLEVBQUU7SUFDRixJQUFJLEtBQUssR0FBRztRQUNWLEVBQUUsRUFBRSxlQUFlO1FBQ25CLElBQUksRUFBRSxZQUFZLENBQUMsT0FBTztRQUMxQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUNkLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxNQUFNLEdBQUcsQ0FB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