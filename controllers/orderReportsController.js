// controllers/orderReportsController.js
const { ObjectId } = require("mongodb");
const client = require("../config/db");

exports.getSalesPerformance = async (req, res) => {
  try {
    const { startDate, endDate, district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");
    
    const matchConditions = {
      status: 'delivered'
    };
    
    if (startDate && endDate) {
      matchConditions.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (district && district !== 'all') {
      matchConditions['user.district'] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          orderCount: 1
        }
      }
    ];

    const result = await Order.aggregate(pipeline).toArray();
    res.json(result[0] || { totalRevenue: 0, averageOrderValue: 0, orderCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderStatusSummary = async (req, res) => {
  try {
    const { district } = req.query;
    const Order = client.db("sishuSheba").collection("orders");
    
    const matchConditions = {};
    
    if (district && district !== 'all') {
      matchConditions['user.district'] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
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
        $lte: new Date(endDate)
      };
    }
    
    if (district && district !== 'all') {
      matchConditions['user.district'] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            name: '$items.name',
            weight: '$items.weight',
            sku: '$items.sku'
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', { $toDouble: '$items.price' }] } }
        }
      },
      {
        $project: {
          _id: 0,
          productName: '$_id.name',
          weight: '$_id.weight',
          sku: '$_id.sku',
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
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
        $lte: new Date(endDate)
      };
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: '$user.district',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          district: '$_id',
          orderCount: 1,
          totalRevenue: 1
        }
      },
      { $sort: { orderCount: -1 } }
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
        $lte: new Date(endDate)
      };
    }
    
    if (district && district !== 'all') {
      matchConditions['user.district'] = district;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: {
            name: '$user.name',
            mobile: '$user.mobile'
          },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          customerName: '$_id.name',
          mobile: '$_id.mobile',
          orderCount: 1,
          totalSpent: 1
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
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
      { $project: { _id: 0, district: "$_id" } }
    ];

    const result = await Order.aggregate(pipeline).toArray();
    // The result is an array of objects like [{district: 'Dhaka'}], so we map it to an array of strings.
    const districts = result.map(item => item.district);

    res.json(districts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};