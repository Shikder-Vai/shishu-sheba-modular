// controllers/orderReportsController.js
const { ObjectId } = require("mongodb");
const client = require("../config/db");

exports.getSalesPerformance = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");

    const matchConditions = {
      status: "delivered",
    };

    if (startDate && endDate) {
      matchConditions.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (district && district !== "all") {
      matchConditions["user.district"] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          averageOrderValue: { $avg: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
          orderCount: 1,
        },
      },
    ];

    const result = await Order.aggregate(pipeline).toArray();
    res.json(
      result[0] || { totalRevenue: 0, averageOrderValue: 0, orderCount: 0 },
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderStatusSummary = async (req, res) => {
  try {
    const { district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");

    const matchConditions = {};

    if (district && district !== "all") {
      matchConditions["user.district"] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ];

    const result = await Order.aggregate(pipeline).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductPerformance = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");

    const matchConditions = {};

    if (startDate && endDate) {
      matchConditions.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (district && district !== "all") {
      matchConditions["user.district"] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            name: "$items.name",
            weight: "$items.weight",
            sku: "$items.sku",
          },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$items.quantity", { $toDouble: "$items.price" }],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          productName: "$_id.name",
          weight: "$_id.weight",
          sku: "$_id.sku",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ];

    const result = await Order.aggregate(pipeline).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDistrictWiseOrders = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const Order = client.db("sishuSheba").collection("orders");

    const matchConditions = {};

    if (startDate && endDate) {
      matchConditions.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: "$user.district",
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
        },
      },
      {
        $project: {
          _id: 0,
          district: "$_id",
          orderCount: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { orderCount: -1 } },
    ];

    const result = await Order.aggregate(pipeline).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCustomerInsights = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");

    const matchConditions = {};

    if (startDate && endDate) {
      matchConditions.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (district && district !== "all") {
      matchConditions["user.district"] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: {
            name: "$user.name",
            mobile: "$user.mobile",
          },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
      {
        $project: {
          _id: 0,
          customerName: "$_id.name",
          mobile: "$_id.mobile",
          orderCount: 1,
          totalSpent: 1,
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ];

    const result = await Order.aggregate(pipeline).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unique districts for the filter dropdown using a modern aggregation pipeline
exports.getUniqueDistricts = async (req, res) => {
  try {
    const Order = client.db("sishuSheba").collection("orders");

    const pipeline = [
      { $match: { "user.district": { $ne: null, $ne: "" } } }, // Ensure district exists
      { $group: { _id: "$user.district" } },
      { $sort: { _id: 1 } }, // Sort districts alphabetically
      { $project: { _id: 0, district: "$_id" } },
    ];

    const result = await Order.aggregate(pipeline).toArray();
    // The result is an array of objects like [{district: 'Dhaka'}], so we map it to an array of strings.
    const districts = result.map((item) => item.district);

    res.json(districts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all customers with order details and auto-calculated tags (grouped by name + mobile)
exports.getAllCustomers = async (req, res) => {
  try {
    const Order = client.db("sishuSheba").collection("orders");
    const now = new Date();
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

    // Parse order date from user.orderDate string or use _id timestamp
    const pipeline = [
      {
        $addFields: {
          // Use ObjectId timestamp as orderTimestamp (MongoDB ObjectIds have embedded timestamps)
          orderTimestamp: { $toDate: "$_id" },
        },
      },
      {
        $group: {
          // Group by BOTH name AND mobile (same customer = same name + mobile)
          _id: {
            name: "$user.name",
            mobile: "$user.mobile",
          },
          address: { $first: "$user.address" },
          district: { $first: "$user.district" },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          createdAt: { $min: "$orderTimestamp" },
          lastOrderDate: { $max: "$orderTimestamp" },
          source: { $first: "$orderSource" },
        },
      },
      {
        $addFields: {
          // Calculate tag based on mobile number and last order date
          tag: {
            $cond: [
              { $eq: ["$orderCount", 1] },
              "new", // First-time customer (only 1 order)
              {
                $cond: [
                  { $lt: ["$lastOrderDate", twoMonthsAgo] },
                  "rare", // No orders in last 2 months
                  {
                    $cond: [
                      {
                        $gte: [
                          {
                            $divide: [
                              "$orderCount",
                              {
                                $max: [
                                  {
                                    $divide: [
                                      {
                                        $subtract: [now, "$createdAt"],
                                      },
                                      2592000000, // milliseconds in 30 days
                                    ],
                                  },
                                  1,
                                ],
                              },
                            ],
                          },
                          1, // At least 1 order per month
                        ],
                      },
                      "special", // Orders frequently (1+ per month)
                      "regular", // Regular customer (2+ months between orders)
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          customerName: "$_id.name",
          mobile: "$_id.mobile",
          address: 1,
          district: 1,
          orderCount: 1,
          totalSpent: 1,
          createdAt: 1,
          lastOrderDate: 1,
          source: { $ifNull: ["$source", "N/A"] },
          tag: 1,
        },
      },
      { $sort: { lastOrderDate: -1 } },
    ];

    const result = await Order.aggregate(pipeline).toArray();
    res.json(result);
  } catch (error) {
    console.error("getAllCustomers Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
