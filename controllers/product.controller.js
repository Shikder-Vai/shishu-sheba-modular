const { ObjectId } = require("mongodb");
const client = require("../config/db");

const productCollection = client.db("sishuSheba").collection("products");

// Refactored to handle product variants
exports.addProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Basic validation
    if (!productData.name || !productData.variants || productData.variants.length === 0) {
      return res.status(400).send({ error: "Product name and at least one variant are required." });
    }

    // Ensure all variants have SKUs
    if (productData.variants.some(v => !v.sku)) {
      return res.status(400).send({ error: "All product variants must have a unique SKU." });
    }

    // Check for SKU uniqueness across the database
    const skus = productData.variants.map(v => v.sku);
    const existingProduct = await productCollection.findOne({ "variants.sku": { $in: skus } });

    if (existingProduct) {
      return res.status(409).send({ error: "One or more SKUs are already in use." });
    }

    const result = await productCollection.insertOne(productData);
    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { page, limit, category } = req.query;

    let query = {};
    if (category) {
      query.category = category;
    }

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const products = await productCollection.find(query).skip(skip).limit(limitNum).toArray();
      const total = await productCollection.countDocuments(query);

      return res.send({ products, total });
    } else {
      const products = await productCollection.find(query).toArray();
      return res.send({ products });
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const id = req.params.id;
    let product = null;
    if (ObjectId.isValid(id)) {
      product = await productCollection.findOne({ _id: new ObjectId(id) });
    }
    if (!product) {
      product = await productCollection.findOne({ _id: id });
    }

    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.send(product);
  } catch (error) {
    console.error("Failed to fetch product by ID:", error);
    res.status(500).send({ message: "Server error" });
  }
};

// This function might need to be re-evaluated based on how you want to display categories with variants
exports.getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const result = await productCollection.find({ category }).toArray();
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to fetch by category:", error);
    res.status(500).json({ message: "Failed to fetch by category", error });
  }
};

// This function is likely for preview and might not need changes unless you want to validate variants
exports.addProductPreview = async (req, res) => {
  try {
    const product = req.body;
    res.send({ product });
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// Refactored to handle product variants
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Basic validation
    if (!updateData.name || !updateData.variants || updateData.variants.length === 0) {
      return res.status(400).send({ error: "Product name and at least one variant are required." });
    }

    // Ensure all variants have SKUs
    if (updateData.variants.some(v => !v.sku)) {
      return res.status(400).send({ error: "All product variants must have a unique SKU." });
    }

    // Prevent changing the _id
    if (updateData._id) {
      delete updateData._id;
    }

    // Find the product first
    let productToUpdate = null;
    if (ObjectId.isValid(id)) {
      productToUpdate = await productCollection.findOne({ _id: new ObjectId(id) });
    }
    if (!productToUpdate) {
      productToUpdate = await productCollection.findOne({ _id: id });
    }

    if (!productToUpdate) {
      return res.status(404).send({ error: "Product not found" });
    }

    // Check for SKU uniqueness across other products
    const skus = updateData.variants.map(v => v.sku);
    if (skus.length > 0) {
        const uniquenessQuery = {
            "variants.sku": { $in: skus },
            _id: { $ne: productToUpdate._id } // Use the _id from the found product
        };
        const existingProduct = await productCollection.findOne(uniquenessQuery);

        if (existingProduct) {
            return res.status(409).send({ error: "One or more SKUs are already in use by another product." });
        }
    }

    const result = await productCollection.updateOne(
      { _id: productToUpdate._id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      // This should not happen if we found the product before
      return res.status(404).send({ error: "Product not found during update" });
    }

    res.send({ success: true, updatedId: id });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    let product = null;
    // Try finding by ObjectId first
    if (ObjectId.isValid(id)) {
      product = await productCollection.findOne({ _id: new ObjectId(id) });
    }

    // If not found, try finding by string ID
    if (!product) {
      product = await productCollection.findOne({ _id: id });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching single product:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error or invalid ID format",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: new ObjectId(id) };
    const result = await productCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

exports.getLowStockProducts = async (req, res) => {
  try {
    const lowStockThreshold = 10;
    const lowStockProducts = await productCollection.aggregate([
      { $unwind: "$variants" },
      { $match: { "variants.stock_quantity": { $lt: lowStockThreshold } } },
      {
        $project: {
          _id: 0,
          productName: "$name",
          variantName: "$variants.name",
          sku: "$variants.sku",
          stock_quantity: "$variants.stock_quantity",
        },
      },
    ]).toArray();

    res.status(200).json(lowStockProducts);
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};
