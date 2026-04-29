const { ObjectId } = require("mongodb");
const client = require("../config/db");

exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");

    const start = startDate ? new Date(startDate) : null;
    const end   = endDate   ? new Date(endDate)   : null;

    const deliveredMatch = { status: "delivered" };
    const allOrdersMatch = {};

    if (start && end) {
      deliveredMatch.$expr = {
        $and: [
          { $gte: [{ $dateFromString: { dateString: "$deliveredBy.deliveredTime", onError: new Date(0) } }, start] },
          { $lte: [{ $dateFromString: { dateString: "$deliveredBy.deliveredTime", onError: new Date(0) } }, end] },
        ],
      };
      allOrdersMatch.$expr = {
        $and: [
          { $gte: [{ $toDate: "$_id" }, start] },
          { $lte: [{ $toDate: "$_id" }, end] },
        ],
      };
    }

    if (district && district !== "all") {
      deliveredMatch["user.district"] = district;
      allOrdersMatch["user.district"] = district;
    }

    const [
      deliveredStats,
      totalOrdersResult,
      orderStatusSummary,
      productPerformance,
      districtWiseOrders,
      customerInsights,
      pendingResult,
      approvedResult,
      processingResult,
      shippedResult,
      cancelResult,
      returnedResult,
    ] = await Promise.all([
      Order.aggregate([
        { $match: deliveredMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            deliveredCount: { $sum: 1 },
            averageDeliveredValue: { $avg: "$total" },
          },
        },
        { $project: { _id: 0, totalRevenue: 1, deliveredCount: 1, averageDeliveredValue: { $round: ["$averageDeliveredValue", 2] } } },
      ]).toArray(),

      Order.aggregate([
        { $match: allOrdersMatch },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalOrdersValue: { $sum: "$total" },
            averageOrderValue: { $avg: "$total" },
          },
        },
        { $project: { _id: 0, totalOrders: 1, totalOrdersValue: 1, averageOrderValue: { $round: ["$averageOrderValue", 2] } } },
      ]).toArray(),

      Order.aggregate([
        { $match: allOrdersMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]).toArray(),

      Order.aggregate([
        { $match: deliveredMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: { name: "$items.name", weight: "$items.weight", sku: "$items.sku" },
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: { $multiply: ["$items.quantity", { $toDouble: "$items.price" }] } },
          },
        },
        { $project: { _id: 0, productName: "$_id.name", weight: "$_id.weight", sku: "$_id.sku", totalQuantity: 1, totalRevenue: 1 } },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]).toArray(),

      Order.aggregate([
        { $match: allOrdersMatch },
        { $group: { _id: "$user.district", orderCount: { $sum: 1 }, totalRevenue: { $sum: "$total" } } },
        { $project: { _id: 0, district: "$_id", orderCount: 1, totalRevenue: 1 } },
        { $sort: { orderCount: -1 } },
      ]).toArray(),

      Order.aggregate([
        { $match: allOrdersMatch },
        {
          $group: {
            _id: { name: "$user.name", mobile: "$user.mobile" },
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$total" },
          },
        },
        { $project: { _id: 0, customerName: "$_id.name", mobile: "$_id.mobile", orderCount: 1, totalSpent: 1 } },
        { $sort: { totalSpent: -1 } },
      ]).toArray(),

      Order.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: "$total" } } }, { $project: { _id: 0, count: 1, totalValue: 1 } }]).toArray(),
      Order.aggregate([{ $match: { status: "approved" } }, { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: "$total" } } }, { $project: { _id: 0, count: 1, totalValue: 1 } }]).toArray(),
      Order.aggregate([{ $match: { status: "processing" } }, { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: "$total" } } }, { $project: { _id: 0, count: 1, totalValue: 1 } }]).toArray(),
      Order.aggregate([{ $match: { status: "shipped" } }, { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: "$total" } } }, { $project: { _id: 0, count: 1, totalValue: 1 } }]).toArray(),
      Order.aggregate([{ $match: { status: "cancel" } }, { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: "$total" } } }, { $project: { _id: 0, count: 1, totalValue: 1 } }]).toArray(),
      Order.aggregate([{ $match: { status: "returned" } }, { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: "$total" } } }, { $project: { _id: 0, count: 1, totalValue: 1 } }]).toArray(),
    ]);

    const delivered = deliveredStats[0] || { totalRevenue: 0, deliveredCount: 0, averageDeliveredValue: 0 };
    const allOrders = totalOrdersResult[0] || { totalOrders: 0, totalOrdersValue: 0, averageOrderValue: 0 };

    res.json({
      salesPerformance: {
        totalRevenue: delivered.totalRevenue,
        averageOrderValue: allOrders.averageOrderValue,
        averageDeliveredValue: delivered.averageDeliveredValue,
        deliveredCount: delivered.deliveredCount,
        totalOrders: allOrders.totalOrders,
        totalOrdersValue: allOrders.totalOrdersValue,
      },
      statusCounts: {
        pending:    { count: pendingResult[0]?.count || 0, totalValue: pendingResult[0]?.totalValue || 0 },
        approved:   { count: approvedResult[0]?.count || 0, totalValue: approvedResult[0]?.totalValue || 0 },
        processing: { count: processingResult[0]?.count || 0, totalValue: processingResult[0]?.totalValue || 0 },
        shipped:    { count: shippedResult[0]?.count || 0, totalValue: shippedResult[0]?.totalValue || 0 },
        cancel:     { count: cancelResult[0]?.count || 0, totalValue: cancelResult[0]?.totalValue || 0 },
        returned:   { count: returnedResult[0]?.count || 0, totalValue: returnedResult[0]?.totalValue || 0 },
      },
      orderStatusSummary,
      productPerformance,
      districtWiseOrders,
      customerInsights,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSalesPerformance = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");

    const matchConditions = {
      status: "delivered",
    };

    if (startDate && endDate) {
      matchConditions.createdAt = {
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
      matchConditions.createdAt = {
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
      matchConditions.createdAt = {
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
      matchConditions.createdAt = {
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
          sources: { $push: "$orderSource" },
        },
      },
      {
        $addFields: {
          // Get unique sources and set default to "website" if empty
          sources: {
            $cond: [
              {
                $eq: [
                  {
                    $size: {
                      $filter: {
                        input: "$sources",
                        as: "src",
                        cond: { $ne: ["$$src", null] },
                      },
                    },
                  },
                  0,
                ],
              },
              ["website"],
              {
                $setUnion: [
                  {
                    $filter: {
                      input: "$sources",
                      as: "src",
                      cond: { $ne: ["$$src", null] },
                    },
                  },
                ],
              },
            ],
          },
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
          sources: 1,
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
