const { ObjectId } = require("mongodb");
const client = require("../config/db");

const productCollection = client.db("sishuSheba").collection("products");
const inventoryLogCollection = client.db("sishuSheba").collection("inventory_logs");

exports.updateStock = async (req, res) => {
  console.log("Update stock request body:", req.body);
  try {
    const { sku, quantity, reason } = req.body;

    if (!sku || quantity === undefined || !reason) {
      return res.status(400).send({ error: "SKU, quantity, and reason are required." });
    }

    const newQuantity = parseInt(quantity);
    if (isNaN(newQuantity)) {
      return res.status(400).send({ error: "Quantity must be a number." });
    }

    const product = await productCollection.findOne({ "variants.sku": sku });
    if (!product) {
      return res.status(404).send({ error: "Product with the specified SKU not found." });
    }

    const currentStock = product.variants.find(v => v.sku === sku).stock_quantity;
    const changeQuantity = newQuantity - currentStock;

    const result = await productCollection.updateOne(
      { "variants.sku": sku },
      { $set: { "variants.$.stock_quantity": newQuantity } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Failed to update stock." });
    }

    const logEntry = {
      sku,
      change_quantity: changeQuantity,
      new_quantity: newQuantity,
      reason,
      timestamp: new Date(),
    };

    await inventoryLogCollection.insertOne(logEntry);

    res.status(200).send({ success: true, message: "Stock updated successfully." });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.getInventoryLogs = async (req, res) => {
  try {
    const { sku } = req.params;
    const logs = await inventoryLogCollection.find({ sku }).sort({ timestamp: -1 }).toArray();
    res.status(200).send(logs);
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};
