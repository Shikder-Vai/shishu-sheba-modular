const { ObjectId } = require("mongodb");
const client = require("../config/db");

const orderCollection = client.db("sishuSheba").collection("orders");
const productCollection = client.db("sishuSheba").collection("products");
const inventoryLogCollection = client
  .db("sishuSheba")
  .collection("inventory_logs");

exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    console.log("Received order data:", JSON.stringify(orderData, null, 2));

    // Sanitize item names
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items.forEach((item) => {
        if (typeof item.name === "object" && item.name !== null) {
          item.name = item.name.en || "";
        }
      });
    }

    // Basic validation
    if (!orderData.items || orderData.items.length === 0) {
      return res
        .status(400)
        .send({ error: "Order must contain at least one item." });
    }

    // Process each item in the order
    for (const item of orderData.items) {
      const { sku, quantity } = item;

      // Find the product variant
      const product = await productCollection.findOne({ "variants.sku": sku });
      if (!product) {
        throw new Error(`Product with SKU ${sku} not found.`);
      }

      const variant = product.variants.find((v) => v.sku === sku);
      if (variant.stock_quantity < quantity) {
        throw new Error(
          `Not enough stock for SKU ${sku}. Available: ${variant.stock_quantity}, Requested: ${quantity}`
        );
      }

      // Update stock quantity
      await productCollection.updateOne(
        { "variants.sku": sku },
        { $inc: { "variants.$.stock_quantity": -quantity } }
      );

      // Create inventory log
      const logEntry = {
        sku,
        change_quantity: -quantity,
        new_quantity: variant.stock_quantity - quantity,
        reason: "sale",
        orderId: orderData.orderId, // Assuming orderId is present in the order data
        timestamp: new Date(),
      };
      await inventoryLogCollection.insertOne(logEntry);
    }

    // Insert the order
    const result = await orderCollection.insertOne(orderData);

    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).send({
      error: "Internal Server Error",
      message: error.message,
      stack: error.stack,
    });
  }
};

exports.getOrdersByStatus = async (req, res) => {
  try {
    const status = req.query.status;
    const orders = await orderCollection.find({ status }).toArray();
    res.send(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      approvedBy,
      processBy,
      deliveredBy,
      shippingBy,
      consignment_id,
      tracking_code,
      cancelBy,
      admin_note,
      shippingNote,
    } = req.body;

    // Handle plain status-only updates (no other fields provided)
    if (
      status &&
      !approvedBy &&
      !processBy &&
      !deliveredBy &&
      !shippingBy &&
      !cancelBy &&
      !admin_note
    ) {
      try {
        if (status === "pending") {
          // Move back to pending: set status and remove metadata fields
          const updateResult = await orderCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: { status },
              $unset: {
                approvedBy: "",
                processBy: "",
                deliveredBy: "",
                cancelBy: "",
                shippingBy: "",
                consignment_id: "",
                tracking_code: "",
                shippingNote: "",
              },
            }
          );

          const updatedOrder = await orderCollection.findOne({
            _id: new ObjectId(id),
          });
          return res.json({
            success: true,
            order: updatedOrder,
            modifiedCount: updateResult.modifiedCount,
          });
        }

        // Generic status-only update
        const updateResult = await orderCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );

        const updatedOrder = await orderCollection.findOne({
          _id: new ObjectId(id),
        });
        return res.json({
          success: true,
          order: updatedOrder,
          modifiedCount: updateResult.modifiedCount,
        });
      } catch (err) {
        console.error("Status-only update failed:", err);
        return res.status(500).json({ error: "Update failed" });
      }
    }

    let result;

    if (admin_note) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { admin_note } }
      );
    }
    if (approvedBy) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, approvedBy } }
      );
    }
    if (processBy) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, processBy } }
      );
    }

    if (shippingBy) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            shippingBy,
            consignment_id,
            tracking_code,
            ...(shippingNote && { shippingNote }),
          },
        }
      );
    }
    if (deliveredBy) {
      try {
        // Step 1: update the order
        await orderCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...(status && { status }),
              ...(deliveredBy && { deliveredBy }),
              ...(cancelBy && { cancelBy }),
            },
          }
        );

        // ✅ Step 2: এখন আবার সেই order টা খুঁজে বের করো
        const updatedOrder = await orderCollection.findOne({
          _id: new ObjectId(id),
        });

        // ✅ Step 3: এটাকে response হিসেবে পাঠাও
        res.send(updatedOrder);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Update failed" });
      }
    }
    if (cancelBy) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, cancelBy } }
      );
    }

    if (result?.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, modifiedCount: result?.modifiedCount || 0 });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log("Searching for order ID:", orderId);

    // Correct way to find by orderId field
    const order = await orderCollection.findOne({ orderId: orderId });

    if (!order) {
      console.log("Order not found for ID:", orderId);
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    console.log("Order found:", order._id);
    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error tracking order:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

// Update full order details (for edit modal)
exports.updateFullOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderData = req.body;

    // Remove _id from items and the main order if present
    delete orderData._id;
    if (orderData.items) {
      orderData.items = orderData.items.map((item) => {
        delete item._id; // Remove _id from each item
        return item;
      });
    }

    // Calculate new totals if items were modified
    if (orderData.items) {
      orderData.subtotal = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      orderData.total = orderData.subtotal + (orderData.shippingCost || 0);
    }

    const result = await orderCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: orderData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updatedOrder = await orderCollection.findOne({
      _id: new ObjectId(id),
    });
    res.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Order update failed:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

exports.deleteOrders = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    const objectIds = ids.map((id) => new ObjectId(id));
    const result = await orderCollection.deleteMany({ _id: { $in: objectIds } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Error deleting orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
