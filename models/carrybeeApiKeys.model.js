const client = require("../config/db");
const carrybeeApiKeysCollection = client
    .db("sishuSheba")
    .collection("carrybeeApiKeys");

module.exports = carrybeeApiKeysCollection;
