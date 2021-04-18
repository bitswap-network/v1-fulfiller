require("dotenv").config();

export let PORT = process.env.PORT ? process.env.PORT : 5000;
export let MONGODB_URI = process.env.MONGODB_URI;
export let SECRET = process.env.SECRET;
export let WHITELIST = JSON.parse(
  process.env.WHITELIST ? process.env.WHITELIST : "[]"
);
export let MAIL = process.env.MAIL;
export let ENCRYPTEDSEEDHEX = process.env.ENCRYPTEDSEEDHEX;
export let PWSALTHEX = process.env.PWSALTHEX;
export let HttpProvider = process.env.HttpProvider;
export let XAlchemyToken = process.env.XAlchemyToken;
export let KEY = process.env.KEY;
export let PUBLIC_KEY = process.env.PUBLIC_KEY;
export let CFDUID = process.env.CFDUID;
