const { ObjectId } = require("mongodb");
const client = require("../config/db");

const productCollection = client.db("sishuSheba").collection("products");

exports.addProduct = async (req, res) => {
  try {
    const product = req.body;
    const result = await productCollection.insertOne(product);
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
      // For non-paginated requests, return the array directly for backward compatibility
      return res.send(products);
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [{ _id: new ObjectId(id) }, { _id: id }],
    };
    const product = await productCollection.findOne(query);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.send(product);
  } catch (error) {
    console.error("Failed to fetch product by ID:", error);
    try {
      const product = await productCollection.findOne({ _id: req.params.id });
      if (!product) {
        return res.status(404).send({ message: "Product not found" });
      }
      res.send(product);
    } catch (fallbackError) {
      res.status(500).send({ message: "Server error" });
    }
  }
};

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

exports.addProductPreview = async (req, res) => {
  try {
    const product = req.body;
    res.send({ product });
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData._id) {
      delete updateData._id;
    }

    const query = {
      $or: [{ _id: new ObjectId(id) }, { _id: id }],
    };

    const result = await productCollection.updateOne(query, {
      $set: updateData,
    });

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Product not found" });
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

    const query = {
      $or: [{ _id: new ObjectId(id) }, { _id: id }],
    };

    const product = await productCollection.findOne(query);

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
    try {
      const product = await productCollection.findOne({ _id: req.params.id });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, error: "Product not found" });
      }
      res.status(200).json({ success: true, data: product });
    } catch (fallbackError) {
      console.error("Error fetching single product:", fallbackError);
      res.status(500).json({
        success: false,
        error: "Internal server error or invalid ID format",
      });
    }
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      const result = await productCollection.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Product not found" });
      }
      return res
        .status(200)
        .json({ success: true, message: "Product deleted successfully" });
    }

    const query = {
      $or: [{ _id: new ObjectId(id) }, { _id: id }],
    };
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
