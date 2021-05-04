require("dotenv").config();

export let PORT = process.env.PORT ? process.env.PORT : 5001;
export let MONGODB_URI = process.env.MONGODB_URI;
export let ENCRYPTEDSEEDHEX = process.env.ENCRYPTEDSEEDHEX;
export let HttpProvider = process.env.HTTP_PROVIDER;
export let XAlchemyToken = process.env.XALCHEMYTOKEN;
export let WALLET_SECRET = process.env.WALLET_SECRET;
export let PUBLIC_KEY_BITCLOUT = process.env.PUBLIC_KEY_BITCLOUT;
export let SEED_HEX = process.env.SEED_HEX;
export let AlchemyAuth = process.env.ALCHEMY_AUTH;
export let ServerAuth = process.env.SERVER_AUTH;
export let NETWORK = process.env.NETWORK;
export let ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;
export let ADDRESS_ENCRYPT_PRIVATEKEY = process.env.ADDRESS_ENCRYPT_PRIVATEKEY
  ? process.env.ADDRESS_ENCRYPT_PRIVATEKEY
  : "";
export let WEBHOOK_ID = 148926;
