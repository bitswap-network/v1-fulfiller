import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as middleware from "./utils/middleware";
import webhookRouter from "./controllers/webhook";
const logger = require("./utils/logger");
const mongoose = require("mongoose");
const config = require("./utils/config");
const app: express.Application = express();

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

app.use(cors());
app.use(helmet()); //security
app.use(express.json());
app.use(middleware.requestLogger);

// API Routes Here
app.get("/", (req, res) => {
  res.status(200).send(`BitSwap Fulfillment API`);
});

app.use("/webhook", webhookRouter);

app.use(middleware.errorHandler);


export default app;
