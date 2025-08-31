const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

// const uri = `mongodb+srv://${process.env.DB_Name}:${process.env.DB_PASS}@shishusheba.qcgze0b.mongodb.net/?retryWrites=true&w=majority&appName=shishuSheba`;
const uri = process.env.URI
console.log(uri);
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

module.exports = client;
