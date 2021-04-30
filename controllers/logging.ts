const logRouter = require("express").Router();
import { verifySignature } from "../utils/identity";
var fs = require("fs");

logRouter.get("/all", (req, res) => {
  //   if (verifySignature(req)) {
  const src = fs.createReadStream("../out.log");
  src.pipe(res);
  //   } else {
  //     res.status(403).send("unauthorized request");
  //   }
});

export default logRouter;
