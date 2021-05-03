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
exports.submitTransaction = exports.sendEth = exports.sendBitclout = exports.process = void 0;
const listing_1 = __importDefault(require("../models/listing"));
const user_1 = __importDefault(require("../models/user"));
const axios_1 = __importDefault(require("axios"));
const identity_1 = require("./identity");
const EthereumTx = require("ethereumjs-tx").Transaction;
const logger = require("./logger");
const config = __importStar(require("./config"));
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
const swapfee = 0.02;
const escrowWallet = web3.eth.accounts.privateKeyToAccount("0x" + config.WALLET_SECRET);
console.log(config);
const sendEth = (ethereumaddress, value, nonce, gasprice, fee) => {
    let rawTx = {
        to: ethereumaddress,
        from: escrowWallet.address,
        value: web3.utils.toHex(web3.utils.toWei((value - value * fee - (21000 * gasprice) / 1e9).toString())),
        gasLimit: web3.utils.toHex(21000),
        gasPrice: web3.utils.toHex(web3.utils.toWei(gasprice.toString(), "gwei")),
        nonce: web3.utils.toHex(nonce),
    };
    console.log(rawTx, escrowWallet, gasprice, nonce);
    const transaction = new EthereumTx(rawTx, {
        chain: config.NETWORK,
    });
    transaction.sign(web3.utils.hexToBytes(escrowWallet.privateKey));
    const serializedTransaction = transaction.serialize();
    return web3.eth.sendSignedTransaction("0x" + serializedTransaction.toString("hex"));
};
exports.sendEth = sendEth;
const sendBitclout = (bitcloutpubkey, amountnanos, fee) => {
    console.log("sending bclt");
    return axios_1.default.post("https://api.bitclout.com/send-bitclout", JSON.stringify({
        AmountNanos: parseInt((amountnanos - amountnanos * fee).toString()),
        MinFeeRateNanosPerKB: 1000,
        RecipientPublicKeyOrUsername: bitcloutpubkey,
        SenderPublicKeyBase58Check: config.PUBLIC_KEY_BITCLOUT,
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
const process = (listing_id) => __awaiter(void 0, void 0, void 0, function* () {
    const gas = yield axios_1.default.get(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${config.ETHERSCAN_KEY}`);
    const nonce = yield web3.eth.getTransactionCount(escrowWallet.address, "pending");
    console.log(gas, nonce);
    const listing = yield listing_1.default.findOne({ _id: listing_id }).exec();
    if (listing) {
        const buyer = yield user_1.default.findOne({ _id: listing.buyer }).exec();
        const seller = yield user_1.default.findOne({ _id: listing.seller }).exec();
        let sendaddress = listing.ethaddress
            ? listing.ethaddress
            : Array.isArray(seller === null || seller === void 0 ? void 0 : seller.ethereumaddress)
                ? seller === null || seller === void 0 ? void 0 : seller.ethereumaddress[0]
                : seller === null || seller === void 0 ? void 0 : seller.ethereumaddress;
        console.log(sendaddress);
        if (buyer && seller && sendaddress) {
            sendEth(sendaddress, listing.etheramount, nonce, parseInt(gas.data.result.FastGasPrice.toString()), swapfee)
                .then((result) => {
                console.log("sendEthResult", result);
                listing.finalTransactionId = result.transactionHash.toLowerCase();
                listing.save();
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
exports.process = process;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsZmlsbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvZnVsZmlsbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnRUFBd0M7QUFDeEMsMERBQWtDO0FBQ2xDLGtEQUEwQjtBQUUxQix5Q0FBd0M7QUFDeEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUV4RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsaURBQW1DO0FBQ25DLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQztBQUNyQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FDeEQsSUFBSSxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQzVCLENBQUM7QUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXBCLE1BQU0sT0FBTyxHQUFHLENBQ2QsZUFBdUIsRUFDdkIsS0FBYSxFQUNiLEtBQWEsRUFDYixRQUFnQixFQUNoQixHQUFXLEVBQ1gsRUFBRTtJQUNGLElBQUksS0FBSyxHQUFHO1FBQ1YsRUFBRSxFQUFFLGVBQWU7UUFDbkIsSUFBSSxFQUFFLFlBQVksQ0FBQyxPQUFPO1FBQzFCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQ2QsQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxD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