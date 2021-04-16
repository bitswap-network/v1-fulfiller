const app = require("./app");
const config = require("./utils/config");
const logger = require("./utils/logger");
const cron = require("node-cron");
import profileQuery from "./utils/query";
cron.schedule("*/10 * * * *", () => {
  console.log("---------------------");
  console.log("Running Cron Job");
  profileQuery("BC1YLjQtaLyForGFpdzmvzCCx1zbSCm58785cABn5zS8KVMeS4Z4aNK");
});

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});
