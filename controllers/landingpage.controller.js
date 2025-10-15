const { ObjectId } = require("mongodb");
const client = require("../config/db");

const landingPageCollection = client.db("sishuSheba").collection("landingpages");
const productCollection = client.db("sishuSheba").collection("products");

// Get all landing pages
const getLandingPages = async (req, res) => {
  try {
    const pages = await landingPageCollection.find({}).toArray();
    res.status(200).send(pages);
  } catch (error) {
    console.error("Error fetching landing pages:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// Get a single landing page by ID
const getLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const landingPageData = await landingPageCollection.findOne({ _id: new ObjectId(id) });

    if (!landingPageData) {
      return res.status(404).send({ message: "Landing page not found." });
    }

    const { featuredProductId } = landingPageData;

    if (featuredProductId) {
      const query = ObjectId.isValid(featuredProductId)
        ? { $or: [{ _id: new ObjectId(featuredProductId) }, { _id: featuredProductId }] }
        : { _id: featuredProductId };

      const product = await productCollection.findOne(query);
      landingPageData.featuredProduct = product;
    }

    res.status(200).send(landingPageData);
  } catch (error) {
    console.error("Error fetching landing page data:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// Create a new landing page
const createLandingPage = async (req, res) => {
  try {
    const content = req.body;
    const result = await landingPageCollection.insertOne({ ...content, createdAt: new Date() });
    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Error creating landing page:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// Update a landing page
const updateLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const content = req.body;
    
    // we can not update the _id field
    delete content._id;

    // Ensure featuredProductId is a valid ObjectId if it exists
    if (content.featuredProductId && !ObjectId.isValid(content.featuredProductId)) {
      delete content.featuredProductId;
    }

    const updateDoc = {
      $set: {
        ...content,
        updatedAt: new Date(),
      },
    };
    const result = await landingPageCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
    res.status(200).send({ success: true, result });
  } catch (error) {
    console.error("Error updating landing page:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// Delete a landing page
const deleteLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await landingPageCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Landing page not found." });
    }
    res.status(200).send({ success: true, message: "Landing page deleted successfully." });
  } catch (error) {
    console.error("Error deleting landing page:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

module.exports = {
  getLandingPages,
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
};