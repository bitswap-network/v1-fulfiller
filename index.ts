const app = require("./app");
const config = require("./utils/config");
const logger = require("./utils/logger");
const cron = require("node-cron");
import fulfill from "./utils/fulfiller";
cron.schedule("*/2 * * * *", async () => {
  console.log("---------------------");
  console.log("Running Fulfill Job");
  await fulfill();
});

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});
