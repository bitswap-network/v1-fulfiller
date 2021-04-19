"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.unknownEndpoint = exports.requestLogger = void 0;
const logger = require("./logger");
const requestLogger = (request, response, next) => {
    logger.info("Method:", request.method);
    logger.info("Path:  ", request.path);
    logger.info("Header:  ", request.header);
    logger.info("Body:  ", request.body);
    logger.info("---");
    next();
};
exports.requestLogger = requestLogger;
const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: "unknown endpoint" });
};
exports.unknownEndpoint = unknownEndpoint;
const errorHandler = (error, request, response, next) => {
    logger.error(error.message);
    if (error.name === "CastError" && error.kind === "ObjectId") {
        return response.status(400).send({ error: "malformatted id" });
    }
    else if (error.name === "ValidationError") {
        return response.status(400).json({ error: error.message });
    }
    next(error);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3V0aWxzL21pZGRsZXdhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRTVCLE1BQU0sYUFBYSxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRTtJQUN2RCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQixJQUFJLEVBQUUsQ0FBQztBQUNULENBQUMsQ0FBQztBQVBXLFFBQUEsYUFBYSxpQkFPeEI7QUFFSyxNQUFNLGVBQWUsR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRTtJQUNuRCxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDO0FBRlcsUUFBQSxlQUFlLG1CQUUxQjtBQUVLLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUU7SUFDN0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFNUIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRTtRQUMzRCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztLQUNoRTtTQUFNLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxpQkFBaUIsRUFBRTtRQUMzQyxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQzVEO0lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBVlcsUUFBQSxZQUFZLGdCQVV2QiJ9