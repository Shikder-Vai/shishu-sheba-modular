const client = require("../config/db");
const pixelCodeCollection = client.db("sishuSheba").collection("pixelCodes");

module.exports = pixelCodeCollection;
