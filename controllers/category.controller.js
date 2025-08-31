const { ObjectId } = require("mongodb");
const client = require("../config/db");

const categoryCollection = client.db("sishuSheba").collection("categories");

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const result = await categoryCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Failed to delete category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add new category
exports.addCategory = async (req, res) => {
  try {
    const { bn, en } = req.body;
    if (!bn || !en) {
      return res.status(400).json({ message: "Both bn and en fields are required" });
    }

    // Generate category slug from English name
    const category = en.replace(/\s+/g, "").toLowerCase();

    const exists = await categoryCollection.findOne({ 
      $or: [{ en }, { category }] 
    });
    if (exists) {
      return res.status(409).json({ 
        message: "Category with this name or slug already exists" 
      });
    }

    const newCategory = { 
      bn: bn.trim(), 
      en: en.trim(), 
      category,
      createdAt: new Date() 
    };
    
    const result = await categoryCollection.insertOne(newCategory);
    res.status(201).json({ 
      message: "Category added successfully", 
      data: { ...newCategory, _id: result.insertedId } 
    });
  } catch (error) {
    console.error("Failed to add category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update existing category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { bn, en } = req.body;

    if (!bn || !en) {
      return res.status(400).json({ message: "Both bn and en fields are required" });
    }

    // Generate new category slug from English name
    const category = en.replace(/\s+/g, "").toLowerCase();

    // Check if new name conflicts with other categories
    const exists = await categoryCollection.findOne({
      $and: [
        { _id: { $ne: new ObjectId(id) } }, // Exclude current category
        { $or: [{ en }, { category }] }     // Check for conflicts
      ]
    });

    if (exists) {
      return res.status(409).json({ 
        message: "Another category with this name or slug already exists" 
      });
    }

    const updatedCategory = {
      bn: bn.trim(),
      en: en.trim(),
      category,
      updatedAt: new Date()
    };

    const result = await categoryCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedCategory }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ 
      message: "Category updated successfully",
      data: { ...updatedCategory, _id: id }
    });
  } catch (error) {
    console.error("Failed to update category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single category (for editing)
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryCollection.findOne({ _id: new ObjectId(id) });
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.json(category);
  } catch (error) {
    console.error("Failed to fetch category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};