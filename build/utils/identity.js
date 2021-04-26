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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSign = void 0;
const config = __importStar(require("./config"));
const crypto_1 = require("crypto");
const elliptic_1 = require("elliptic");
const sha256 = __importStar(require("sha256"));
const decryptSeedHex = (encryptedSeedHex) => {
    const encryptionKey = config.SEED_HEX ? config.SEED_HEX : "";
    const decipher = crypto_1.createDecipher("aes-256-gcm", encryptionKey);
    return decipher.update(Buffer.from(encryptedSeedHex, "hex")).toString();
};
const encryptedSeedHexToPrivateKey = (encryptedSeedHex) => {
    const seedHex = decryptSeedHex(encryptedSeedHex);
    return seedHexToPrivateKey(seedHex);
};
const seedHexToPrivateKey = (seedHex) => {
    const ec = new elliptic_1.ec("secp256k1");
    return ec.keyFromPrivate(seedHex);
};
const handleSign = (data) => {
    const { encryptedSeedHex, transactionHex } = data;
    const privateKey = encryptedSeedHexToPrivateKey(encryptedSeedHex);
    const transactionBytes = Buffer.from(transactionHex, "hex");
    const transactionHash = Buffer.from(sha256.x2(transactionBytes), "hex");
    const signature = privateKey.sign(transactionHash);
    const signatureBytes = Buffer.from(signature.toDER());
    const signatureLength = uintToBuf(signatureBytes.length);
    const signedTransactionBytes = Buffer.concat([
        // This slice is bad. We need to remove the existing signature length field prior to appending the new one.
        // Once we have frontend transaction construction we won't need to do this.
        transactionBytes.slice(0, -1),
        signatureLength,
        signatureBytes,
    ]);
    return {
        signature,
        signedTransactionHex: signedTransactionBytes.toString("hex"),
    };
};
exports.handleSign = handleSign;
const uintToBuf = (uint) => {
    let result = [];
    // var length = Math.ceil((Math.log(uint)/Math.log(2))/8);
    while (uint > 0x80) {
        // var temp = uint % 2;
        result.push((uint & 0xff) | 0x80);
        uint >>>= 7;
    }
    result.push(uint | 0);
    return Buffer.from(result);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWRlbnRpdHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi91dGlscy9pZGVudGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1DQUFxRDtBQUNyRCx1Q0FBb0M7QUFDcEMsK0NBQWlDO0FBRWpDLE1BQU0sY0FBYyxHQUFHLENBQUMsZ0JBQXdCLEVBQUUsRUFBRTtJQUNsRCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDN0QsTUFBTSxRQUFRLEdBQUcsdUJBQWMsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDOUQsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUMxRSxDQUFDLENBQUM7QUFFRixNQUFNLDRCQUE0QixHQUFHLENBQUMsZ0JBQXdCLEVBQUUsRUFBRTtJQUNoRSxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNqRCxPQUFPLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQztBQUNGLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxPQUFlLEVBQUUsRUFBRTtJQUM5QyxNQUFNLEVBQUUsR0FBRyxJQUFJLGFBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMvQixPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxVQUFVLEdBQUcsQ0FBQyxJQUFTLEVBQUUsRUFBRTtJQUMvQixNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ2xELE1BQU0sVUFBVSxHQUFHLDRCQUE0QixDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFFbEUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1RCxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4RSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDdEQsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUV6RCxNQUFNLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDM0MsMkdBQTJHO1FBQzNHLDJFQUEyRTtRQUMzRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdCLGVBQWU7UUFDZixjQUFjO0tBQ2YsQ0FBQyxDQUFDO0lBRUgsT0FBTztRQUNMLFNBQVM7UUFDVCxvQkFBb0IsRUFBRSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0tBQzdELENBQUM7QUFDSixDQUFDLENBQUM7QUFjTyxnQ0FBVTtBQWJuQixNQUFNLFNBQVMsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQ2pDLElBQUksTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUMxQiwwREFBMEQ7SUFDMUQsT0FBTyxJQUFJLEdBQUcsSUFBSSxFQUFFO1FBQ2xCLHVCQUF1QjtRQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2xDLElBQUksTUFBTSxDQUFDLENBQUM7S0FDYjtJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRXRCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMifQ==