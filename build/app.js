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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const middleware = __importStar(require("./utils/middleware"));
const webhook_1 = __importDefault(require("./controllers/webhook"));
const logger = require("./utils/logger");
const mongoose = require("mongoose");
const config = require("./utils/config");
const app = express_1.default();
mongoose
    .connect(config.MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
})
    .then(() => {
    logger.info("Connected to MongoDB");
})
    .catch((error) => {
    logger.error("Error connecting to MongoDB:", error.message);
});
app.use(cors_1.default());
app.use(helmet_1.default()); //security
app.use(express_1.default.json());
app.use(middleware.requestLogger);
app.use(middleware.errorHandler);
// API Routes Here
app.get("/", (req, res) => {
    res.status(200).send(`BitSwap Fulfillment API`);
});
app.use(middleware.errorHandler);
app.use("/webhook", webhook_1.default);
exports.default = app;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUE4QjtBQUM5QixnREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLCtEQUFpRDtBQUNqRCxvRUFBa0Q7QUFDbEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDekMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3JDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sR0FBRyxHQUF3QixpQkFBTyxFQUFFLENBQUM7QUFFM0MsUUFBUTtLQUNMLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO0lBQzNCLGtCQUFrQixFQUFFLElBQUk7SUFDeEIsZUFBZSxFQUFFLElBQUk7SUFDckIsY0FBYyxFQUFFLElBQUk7SUFDcEIsZ0JBQWdCLEVBQUUsS0FBSztDQUN4QixDQUFDO0tBQ0QsSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNULE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUM7S0FDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtJQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDO0FBRUwsR0FBRyxDQUFDLEdBQUcsQ0FBQyxjQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ2hCLEdBQUcsQ0FBQyxHQUFHLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQzdCLEdBQUcsQ0FBQyxHQUFHLENBQUMsaUJBQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ2xDLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRWpDLGtCQUFrQjtBQUNsQixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUN4QixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDakMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsaUJBQWEsQ0FBQyxDQUFDO0FBRW5DLGtCQUFlLEdBQUcsQ0FBQyJ9