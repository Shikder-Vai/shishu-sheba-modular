const { sendBulkShipment } = require("../services/steadfastService");

exports.bulkShipmentHandler = async (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({
      message: "Invalid orders format. Expected an array of orders.",
    });
  }

  try {
    const { response, steadfastOrders } = await sendBulkShipment(
      orders,
      process.env.STEADFAST_API_KEY,
      process.env.STEADFAST_SECRET_KEY
    );

    let result = [];

    if (Array.isArray(response.data)) {
      result = response.data.map((item, index) => {
        const originalInvoice = steadfastOrders[index].invoice;
        return {
          invoice: originalInvoice,
          status: item.status || "error",
          tracking_code: item.tracking_code || "N/A",
          consignment_id: item.consignment_id || null,
          message:
            item.message ||
            (item.status === "success"
              ? "Shipment created successfully"
              : "Shipment failed"),
          steadfast_response: item,
        };
      });
    } else if (response.data.consignment) {
      result = steadfastOrders.map((order) => ({
        invoice: order.invoice,
        status: "success",
        tracking_code: response.data.consignment.tracking_code || "N/A",
        consignment_id: response.data.consignment.consignment_id,
        message: response.data.message || "Shipment created successfully",
        steadfast_response: response.data,
      }));
    } else {
      result = steadfastOrders.map((order) => ({
        invoice: order.invoice,
        status: "error",
        tracking_code: "N/A",
        consignment_id: null,
        message: response.data.message || "Unexpected response from Steadfast",
        steadfast_response: response.data,
      }));
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Steadfast Bulk Error:", error.response?.data || error.message);

    const result = orders.map((order) => ({
      invoice: order.invoice || "MISSING-INVOICE",
      status: "error",
      tracking_code: "N/A",
      consignment_id: null,
      message: error.response?.data?.message || error.message,
      error_details: error.response?.data,
    }));

    res.status(500).json(result);
  }
};
