const client = require("../config/db");
const pathaoKeysCollection = client
    .db("sishuSheba")
    .collection("pathaoApiKeys");

module.exports = pathaoKeysCollection;
