import User from "../models/user";
import Listing from "../models/listing";
import axios from "axios";
import { process } from "../utils/fulfiller";
const swapfee = 0.02;

const validAmount = (value1: number, value2: number) => {
  if (Math.abs(value1 - value2) < 1e-6) {
    return true;
  } else {
    return false;
  }
}

const processListing = async (fromAddress, value, asset, retry, id) => {
  if (retry) {
    const listing = await Listing.findById(id).exec();
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
    const buyer = await User.findOne({
      ethereumaddress: { $in: [fromAddress.toLowerCase()] },
    }).exec();

    if (buyer) {
      if (asset == "ETH") {
        const listing = await Listing.findOneAndUpdate(
          {
            buyer: buyer._id,
            ongoing: true,
            "escrow.full": false,
          },
          {
            "escrow.balance": value,
          },
          {
            new: true,
          }
        ).exec();

        if (listing) {
          if (
            listing.escrow.balance >= listing.etheramount &&
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
  }
};

const markListingAsCompleted = async (toAddress, hash, asset) => {
  const listing = await Listing.findOne({
    ongoing: true,
    finalTransactionId: hash.toLowerCase(),
  }).exec();

  console.log(listing);
  if (listing) {
    const buyer = await User.findById(listing.buyer).exec();
    const seller = await User.findById(listing.seller).exec();
    if (asset == "ETH" && seller && buyer) {
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
      listing.save((err: any) => {
        if (err) {
          throw 500;
        } else {
          try {
            buyer.save((err: any) => {
              if (err) {
                throw 500;
              } else {
                try {
                  seller.save((err: any) => {
                    if (err) {
                      throw 500;
                    } else {
                      axios.post("https://api.bitswap.network/utility/sendcompleteemail", {
                        seller: seller.email,
                        buyer: buyer.email,
                        id: listing._id 
                      }, {
                        headers: {
                          Authorization: "179f7a49640c7004449101b043852736"
                        }
                      })
                      return "Listing completed";
                    }
                  });
                } catch (error) {
                  throw 500;
                }
              }
            });
          } catch (error) {
            throw 500;
          }
        }
      });
    } else {
      throw 400;
    }
  } else {
    throw 404;
  }
};
export { processListing, markListingAsCompleted };
