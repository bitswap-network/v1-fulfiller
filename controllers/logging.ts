const logRouter = require("express").Router();
import { verifySignature } from "../utils/identity";
var fs = require("fs");

logRouter.post("/combined", (req, res) => {
  if (verifySignature(req)) {
    const src = fs.createReadStream("./combined.log");
    src.pipe(res);
  } else {
    res.status(403).send("unauthorized request");
  }
});

logRouter.post("/out", (req, res) => {
  if (verifySignature(req)) {
    const src = fs.createReadStream("./out.log");
    src.pipe(res);
  } else {
    res.status(403).send("unauthorized request");
  }
});

logRouter.post("/error", (req, res) => {
  if (verifySignature(req)) {
    const src = fs.createReadStream("./err.log");
    src.pipe(res);
  } else {
    res.status(403).send("unauthorized request");
  }
});

export default logRouter;
