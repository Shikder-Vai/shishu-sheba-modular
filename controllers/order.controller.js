const { ObjectId } = require("mongodb");
const client = require("../config/db");

const orderCollection = client.db("sishuSheba").collection("orders");

exports.createOrder = async (req, res) => {
  try {
    const item = req.body;
    const result = await orderCollection.insertOne(item);
    res.status(201).send(result);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).send({ error: "Internal Server Error" });
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
    } = req.body;

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
