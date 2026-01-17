const client = require("../config/db");
const steadfastKeysCollection = client
  .db("sishuSheba")
  .collection("steadfastApiKeys");

module.exports = steadfastKeysCollection;
