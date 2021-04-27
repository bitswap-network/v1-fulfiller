import User from "../models/user";
import Listing from "../models/listing";
import Transaction from "../models/transaction";
import { process } from "../utils/fulfiller";

const processListing = async (fromAddress, value, asset) => {
  const buyer = await User.findOne({
    ethereumaddress: fromAddress.toLowerCase(),
  }).exec();

  if (buyer) {
    if (asset == "ETH") {
      const listing = await Listing.findOneAndUpdate(
        {
          buyer: buyer._id,
          ongoing: true,
        },
        {
          $inc: {
            "escrow.balance": value,
          },
        },
        {
          new: true,
        }
      ).exec();

      if (listing) {
        if (listing.escrow.balance >= listing.etheramount) {
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
      throw 400;
      //   throw  "Invalid transaction type";
    }
  } else {
    return 404;
    // throw  "Buyer not found";
  }
};

const markListingAsCompleted = (value) => {};
