const { ObjectId } = require("mongodb");
const client = require("../config/db");

const orderCollection = client.db("sishuSheba").collection("orders");
const productCollection = client.db("sishuSheba").collection("products");
const customersCollection = client.db("sishuSheba").collection("customers");
const inventoryLogCollection = client
  .db("sishuSheba")
  .collection("inventory_logs");

exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    console.log("Received order data:", JSON.stringify(orderData, null, 2));

    const customerEmail = orderData.user?.email || orderData.email;
    const customerMobile = orderData.user?.mobile || orderData.mobile || orderData.user?.phone;
    if (customerEmail || customerMobile) {
      const banQuery = [];
      if (customerEmail) banQuery.push({ email: customerEmail });
      if (customerMobile) banQuery.push({ mobile: customerMobile });
      const customer = await customersCollection.findOne({ $or: banQuery });
      if (customer?.status === "banned") {
        return res.status(403).json({ error: "Your account has been banned. Please contact support." });
      }
    }

    // Sanitize item names
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items.forEach((item) => {
        if (typeof item.name === "object" && item.name !== null) {
          item.name = item.name.en || "";
        }
      });
    }

    if (!orderData.items || orderData.items.length === 0) {
      return res
        .status(400)
        .send({ error: "Order must contain at least one item." });
    }

    for (const item of orderData.items) {
      const { sku, quantity } = item;

      const product = await productCollection.findOne({ "variants.sku": sku });
      if (!product) {
        return res
          .status(400)
          .send({ error: `Product with SKU ${sku} not found.` });
      }

      if (!Array.isArray(product.variants)) {
        console.error(
          `Data Integrity Error: Product with ID ${product._id} has a malformed 'variants' field (not an array).`,
        );
        return res
          .status(500)
          .send({ error: "Internal Server Error due to data inconsistency." });
      }

      const variant = product.variants.find((v) => v.sku === sku);

      if (!variant) {
        console.error(
          `Data Integrity Error: SKU ${sku} not found in variants of product ${product._id}, though product was matched.`,
        );
        return res
          .status(500)
          .send({ error: "Internal Server Error due to data inconsistency." });
      }

      if (typeof variant.stock_quantity !== "number") {
        console.error(
          `Data Integrity Error: Variant with SKU ${sku} in product ${product._id} is missing 'stock_quantity' or it is not a number.`,
        );
        return res
          .status(400)
          .send({ error: `Product variant with SKU ${sku} is unavailable.` });
      }

      // if (variant.stock_quantity < quantity) {
      //   return res.status(400).send({
      //     error: `Not enough stock for SKU ${sku}. Available: ${variant.stock_quantity}, Requested: ${quantity}`,
      //   });
      // }

      // Update stock quantity
      await productCollection.updateOne(
        { "variants.sku": sku },
        { $inc: { "variants.$.stock_quantity": -quantity } },
      );

      // Create inventory log
      const logEntry = {
        sku,
        change_quantity: -quantity,
        new_quantity: variant.stock_quantity - quantity,
        reason: "sale",
        orderId: orderData.orderId,
        timestamp: new Date(),
      };
      await inventoryLogCollection.insertOne(logEntry);
    }

    orderData.clientIp = req.clientIp || req.ip || null;
    orderData.createdAt = new Date();

    const result = await orderCollection.insertOne(orderData);

    // ── Server-Side Tracking (fire-and-forget) ───────────────────────────────
    const tracking = require("../services/tracking");
    tracking.fireEvent(
      "purchase",
      { order: { ...orderData, orderId: orderData.orderId }, user: orderData.user },
      {
        ip: req.clientIp || req.ip || req.headers["x-forwarded-for"],
        userAgent: req.headers["user-agent"],
        cookies: req.cookies || {},
        clientId: req.cookies?.["_ga"] || null,
      }
    ).catch((err) => console.error("[Tracking] purchase event failed:", err.message));
    // ────────────────────────────────────────────────────────────────────────

    res.status(201).send({ success: true, insertedId: result.insertedId });

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).send({
      error: "Internal Server Error",
      message: error.message,
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
      new_note,
    } = req.body;

    if (
      status &&
      !approvedBy &&
      !processBy &&
      !deliveredBy &&
      !shippingBy &&
      !cancelBy &&
      !admin_note &&
      !new_note
    ) {
      try {
        if (status === "pending") {
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
            },
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

        const updateResult = await orderCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } },
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

    if (new_note) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { admin_notes: new_note } },
      );
    }
    if (approvedBy) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, approvedBy } },
      );
    }
    if (processBy) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, processBy } },
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
        },
      );
    }
    if (deliveredBy) {
      try {
        await orderCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...(status     && { status }),
              ...(deliveredBy && { deliveredBy }),
              ...(cancelBy   && { cancelBy }),
              deliveredAt: new Date(),
            },
          },
        );

        const updatedOrder = await orderCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(updatedOrder);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Update failed" });
      }
    }
    if (cancelBy) {
      result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, cancelBy } },
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

exports.updateFullOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderData = req.body;

    delete orderData._id;
    if (orderData.items) {
      orderData.items = orderData.items.map((item) => {
        delete item._id;
        return item;
      });
    }

    if (orderData.items) {
      orderData.subtotal = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      orderData.total = orderData.subtotal + (orderData.shippingCost || 0);
    }

    const result = await orderCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: orderData },
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
    const result = await orderCollection.deleteMany({
      _id: { $in: objectIds },
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Error deleting orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getOrdersByMobile = async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ error: "Mobile number is required" });
    }

    // Query by user.mobile (correct field path)
    const orders = await orderCollection
      .find({ "user.mobile": mobile })
      .toArray();
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders by mobile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const clientDB = require("../config/db");
    const adminCollection = clientDB.db("sishuSheba").collection("admin");
    const customersCollection = clientDB.db("sishuSheba").collection("customers");

    let user = await customersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      user = await adminCollection.findOne({ _id: new ObjectId(userId) });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { email, phone, mobile } = user;

    const query = {
      $or: [
        { userId: userId },
      ]
    };

    const searchEmail = email || user.email;
    const searchPhone = phone || mobile || user.mobile;

    if (searchEmail) query.$or.push({ "user.email": searchEmail });
    if (searchPhone) query.$or.push({ "user.mobile": searchPhone });

    const orders = await orderCollection.find(query).sort({ _id: -1 }).toArray();

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching my orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /v1/top-selling-products
exports.getTopSellingProducts = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit) || 8));

    const pipeline = [
      { $match: { status: "delivered" } },
      { $unwind: "$items" },
      { $match: { "items._id": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: { $toString: "$items._id" },
          totalSold: { $sum: { $ifNull: ["$items.quantity", 1] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, "$$productId"],
                },
              },
            },
          ],
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$product", { totalSold: "$totalSold" }] },
        },
      },
    ];

    const results = await orderCollection.aggregate(pipeline).toArray();

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching top selling products:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};
