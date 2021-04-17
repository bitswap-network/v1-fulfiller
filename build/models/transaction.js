"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const transactionSchema = new mongoose_1.Schema({
    username: { type: String, required: true },
    bitcloutpubkey: { type: String },
    transactiontype: {
        type: String,
        required: true,
        enum: ["withdraw", "deposit"],
    },
    status: { type: String, required: true, enum: ["completed", "pending"] },
    bitcloutnanos: { type: Number, required: true },
    created: { type: Date, default: Date.now },
    completed: { type: Date },
    tx_id: { type: String },
});
const Transaction = mongoose_1.model("Transaction", transactionSchema);
exports.default = Transaction;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNhY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9tb2RlbHMvdHJhbnNhY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBbUQ7QUFhbkQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFNLENBQWlCO0lBQ25ELFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtJQUMxQyxjQUFjLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQ2hDLGVBQWUsRUFBRTtRQUNmLElBQUksRUFBRSxNQUFNO1FBQ1osUUFBUSxFQUFFLElBQUk7UUFDZCxJQUFJLEVBQUUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDO0tBQzlCO0lBQ0QsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsRUFBRTtJQUN4RSxhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7SUFDL0MsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUMxQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3pCLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7Q0FDeEIsQ0FBQyxDQUFDO0FBRUgsTUFBTSxXQUFXLEdBQUcsZ0JBQUssQ0FBaUIsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFFNUUsa0JBQWUsV0FBVyxDQUFDIn0=