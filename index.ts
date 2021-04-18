import app from "./app";
const config = require("./utils/config");
const logger = require("./utils/logger");

app.listen(config.PORT, () => {
  process.setMaxListeners(Infinity);
  logger.info(`Server running on port ${config.PORT}`);
});
