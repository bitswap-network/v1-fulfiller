require("dotenv").config();

export let PORT = process.env.PORT ? process.env.PORT : 5000;
export let MONGODB_URI = process.env.MONGODB_URI ? process.env.MONGODB_URI : "mongodb+srv://admin:irxvNRi4aYEmLYBG@bitswap.lernp.mongodb.net/bitswap";