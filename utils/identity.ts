import * as config from "./config";
import { createDecipher, randomBytes, createHmac } from "crypto";
import { ec as EC } from "elliptic";
import * as sha256 from "sha256";

const decryptSeedHex = (encryptedSeedHex: string) => {
  const encryptionKey = config.SEED_HEX ? config.SEED_HEX : "";
  const decipher = createDecipher("aes-256-gcm", encryptionKey);
  return decipher.update(Buffer.from(encryptedSeedHex, "hex")).toString();
};

const encryptedSeedHexToPrivateKey = (encryptedSeedHex: string) => {
  const seedHex = decryptSeedHex(encryptedSeedHex);
  return seedHexToPrivateKey(seedHex);
};
const seedHexToPrivateKey = (seedHex: string) => {
  const ec = new EC("secp256k1");
  return ec.keyFromPrivate(seedHex);
};

const handleSign = (data: any) => {
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
const uintToBuf = (uint: number) => {
  let result: number[] = [];
  // var length = Math.ceil((Math.log(uint)/Math.log(2))/8);
  while (uint > 0x80) {
    // var temp = uint % 2;
    result.push((uint & 0xff) | 0x80);
    uint >>>= 7;
  }

  result.push(uint | 0);

  return Buffer.from(result);
};

const verifyAlchemySignature = (request: any) => {
  const token = config.AlchemyAuth ? config.AlchemyAuth : "";
  const headers = request.headers;
  const signature = headers["x-alchemy-signature"]; // Lowercase for NodeJS
  const body = request.body;
  const hmac = createHmac("sha256", token); // Create a HMAC SHA256 hash using the auth token
  hmac.update(JSON.stringify(body), "utf8");
  const digest = hmac.digest("hex");
  console.log("sigdig: ", signature, digest);
  return signature === digest; // If signature equals your computed hash, return true
};

const verifySignature = (request: any) => {
  const token = config.ServerAuth ? config.ServerAuth : "";
  const headers = request.headers;
  const signature = headers["server-signature"]; // Lowercase for NodeJS
  const body = request.body;
  const hmac = createHmac("sha256", token); // Create a HMAC SHA256 hash using the auth token
  hmac.update(JSON.stringify(body), "utf8");
  const digest = hmac.digest("hex");
  console.log("sigdig: ", signature, digest);
  return signature === digest; // If signature equals your computed hash, return true
};

export { handleSign, verifyAlchemySignature, verifySignature };
