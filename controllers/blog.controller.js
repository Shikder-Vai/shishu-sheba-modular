const { ObjectId } = require("mongodb");
const client = require("../config/db"); // Assuming you have a MongoDB client exported here

const blogCollection = client.db("sishuSheba").collection("blogs");

// CREATE a new blog post
exports.createBlogPost = async (req, res) => {
  try {
    const blog = req.body;
    blog.createdAt = new Date();
    const result = await blogCollection.insertOne(blog);
    res
      .status(201)
      .json({ message: "Blog post created", insertedId: result.insertedId });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create blog post", error: error.message });
  }
};

// READ all blog posts
exports.getAllBlogPosts = async (req, res) => {
  try {
    const blogs = await blogCollection.find().sort({ createdAt: -1 }).toArray();
    res.status(200).json(blogs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch blog posts", error: error.message });
  }
};

// READ single blog post by ID
exports.getBlogPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await blogCollection.findOne({ _id: new ObjectId(id) });

    if (!blog) return res.status(404).json({ message: "Blog post not found" });
    res.status(200).json(blog);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch blog post", error: error.message });
  }
};

// UPDATE a blog post
exports.updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await blogCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.status(200).json({ message: "Blog post updated" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update blog post", error: error.message });
  }
};

// DELETE a blog post
exports.deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await blogCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.status(200).json({ message: "Blog post deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete blog post", error: error.message });
  }
};
