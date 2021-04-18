"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const listingSchema = new mongoose_1.Schema({
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    buyer: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    currencysaletype: { type: String, required: true, enum: ["ETH", "USD"] },
    bitcloutnanos: { type: Number, required: true },
    usdamount: { type: Number },
    etheramount: { type: Number },
    ongoing: { type: Boolean, default: false },
    escrow: {
        balance: { type: Number, default: 0 },
        full: { type: Boolean, default: false },
    },
    bitcloutsent: { type: Boolean, default: true },
    bitcloutTransactionId: { type: String, default: "" },
    finalTransactionId: { type: String, default: "" },
    created: {
        type: Date,
        default: Date.now,
    },
    completed: {
        status: { type: Boolean, default: false },
        date: { type: Date },
    },
});
const Listing = mongoose_1.model("Listing", listingSchema);
exports.default = Listing;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL21vZGVscy9saXN0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQW1EO0FBa0JuRCxNQUFNLGFBQWEsR0FBRyxJQUFJLGlCQUFNLENBQWE7SUFDM0MsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7SUFDcEUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7SUFDbEUsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFO0lBQ3hFLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtJQUMvQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQzNCLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7SUFDN0IsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO0lBQzFDLE1BQU0sRUFBRTtRQUNOLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtRQUNyQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7S0FDeEM7SUFDRCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7SUFDOUMscUJBQXFCLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7SUFDcEQsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7SUFDakQsT0FBTyxFQUFFO1FBQ1AsSUFBSSxFQUFFLElBQUk7UUFDVixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUc7S0FDbEI7SUFDRCxTQUFTLEVBQUU7UUFDVCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7UUFDekMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtLQUNyQjtDQUNGLENBQUMsQ0FBQztBQUNILE1BQU0sT0FBTyxHQUFHLGdCQUFLLENBQWEsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBRTVELGtCQUFlLE9BQU8sQ0FBQyJ9