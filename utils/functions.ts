import User from "../models/user";
import Listing from "../models/listing";
import axios from "axios";
import crypto from "crypto";
import { poolDoc } from "../models/pool";
import Pool from "../models/pool";
import * as config from "./config";
import { process } from "../utils/fulfiller";
import { AxiosResponse } from "axios";
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.HttpProvider));

const swapfee = 0.02;

const algorithm = "aes-256-cbc";
const validAmount = (balance: number, amount: number) => {
  //valid range error 0.1%
  if (Math.abs(balance - amount) / amount <= 0.001) {
    return true;
  } else {
    return false;
  }
};
export const encryptAddress = (address: string) => {
  let salt = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(config.ADDRESS_ENCRYPT_PRIVATEKEY),
    salt
  );
  let encrypted = cipher.update(address);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {
    salt: salt.toString("hex"),
    encryptedKey: encrypted.toString("hex"),
  };
};

export const decryptAddress = (keyObject: poolDoc["privateKey"]) => {
  let salt = Buffer.from(keyObject.salt, "hex");
  let encryptedAddress = Buffer.from(keyObject.encryptedKey, "hex");
  let decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(config.ADDRESS_ENCRYPT_PRIVATEKEY),
    salt
  );
  let decrypted = decipher.update(encryptedAddress);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

export const addAddressWebhook: (
  address: string[]
) => Promise<AxiosResponse> = async function (
  address: string[]
): Promise<AxiosResponse<any>> {
  try {
    return await axios.patch(
      "https://dashboard.alchemyapi.io/api/update-webhook-addresses",
      {
        webhook_id: config.WEBHOOK_ID,
        addresses_to_add: address,
        addresses_to_remove: [],
      },
      {
        headers: { "X-Alchemy-Token": config.XAlchemyToken },
      }
    );
  } catch (e) {
    throw e;
  }
};
export const processListing = async (listing_id, value, asset, retry) => {
  if (retry) {
    const listing = await Listing.findById(listing_id).exec();
    if (listing) {
      if (
        validAmount(listing.escrow.balance, listing.etheramount) &&
        !listing.completed.status
      ) {
        listing.escrow.full = true;
        listing.save((err: any) => {
          if (err) {
            throw 500;
            //   throw  "An error occurred while saving the listing";
          } else {
            try {
              process(listing._id);
              return "Listing successfully fulfilled";
            } catch (error) {
              throw 500;
              // throw  error.message;
            }
          }
        });
      } else {
        throw 409;
        //   throw "Insufficient funds";
      }
    } else {
      throw 404;
      // throw  "Listing could not be found";
    }
  } else {
    const listing = await Listing.findById(listing_id).exec();

    if (listing && asset == "ETH") {
      listing.escrow.balance += value;

      if (
        validAmount(listing.escrow.balance, listing.etheramount) &&
        !listing.escrow.full
      ) {
        listing.escrow.full = true;
        listing.save((err: any) => {
          if (err) {
            throw 500;
            //   throw  "An error occurred while saving the listing";
          } else {
            try {
              process(listing._id);
              return "Listing successfully fulfilled";
            } catch (error) {
              throw 500;
              // throw  error.message;
            }
          }
        });
      } else {
        listing.save();
        throw 409;
        //   throw "Insufficient funds";
      }
    } else {
      return 404;
      // throw  "Buyer not found";
    }
  }
};

export const markListingAsCompleted = async (toAddress, hash, asset) => {
  const listing = await Listing.findOne({
    ongoing: true,
    finalTransactionId: hash.toLowerCase(),
  }).exec();

  console.log(listing);
  if (listing) {
    const pool = await Pool.findById(listing.pool).exec();
    const buyer = await User.findById(listing.buyer).exec();
    const seller = await User.findById(listing.seller).exec();
    if (asset == "ETH" && seller && buyer && pool) {
      const balance = await web3.eth.getBalance(pool.address);
      pool.active = false;
      pool.listing = null;
      pool.balance = balance / 1e18;
      buyer.bitswapbalance +=
        (listing.bitcloutnanos - listing.bitcloutnanos * swapfee) / 1e9;
      buyer.completedorders += 1;
      buyer.buystate = false;
      listing.ongoing = false;
      listing.bitcloutsent = true;
      listing.escrowsent = true;
      listing.completed = {
        status: true,
        date: new Date(),
      };
      seller.completedorders += 1;
      try {
        await pool.save();
        await listing.save();
        await buyer.save();
        await seller.save();
        await axios.post(
          "https://api.bitswap.network/utility/sendcompleteemail",
          {
            seller: seller.email,
            buyer: buyer.email,
            id: listing._id,
          },
          {
            headers: {
              Authorization: "179f7a49640c7004449101b043852736",
            },
          }
        );
        return "Listing completed";
      } catch (e) {
        throw 500;
      }
    } else {
      throw 400;
    }
  } else {
    throw 404;
  }
};
