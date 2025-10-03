const { ObjectId } = require("mongodb");
const client = require("../config/db");

const landingPageCollection = client.db("sishuSheba").collection("landingpage");
const productCollection = client.db("sishuSheba").collection("products");
const reviewCollection = client.db("sishuSheba").collection("reviews");

const updateLandingPage = async (req, res) => {
  try {
    const content = req.body;
    const query = { pageName: "main" };
    const updateDoc = {
      $set: {
        ...content,
        updatedAt: new Date(),
      },
    };
    const options = { upsert: true };
    const result = await landingPageCollection.updateOne(query, updateDoc, options);
    res.status(200).send({ success: true, result });
  } catch (error) {
    console.error("Error updating landing page:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const getLandingPage = async (req, res) => {
  try {
    const landingPageData = await landingPageCollection.findOne({ pageName: "main" });

    if (!landingPageData) {
      return res.status(404).send({ message: "Landing page content not set." });
    }

    const { featuredProductId } = landingPageData;

    if (!featuredProductId) {
      return res.status(404).send({ message: "No featured product ID is set for the landing page." });
    }

    const aggregationPipeline = [
      {
        $match: {
          $or: [
            { _id: ObjectId.isValid(featuredProductId) ? new ObjectId(featuredProductId) : null },
            { _id: featuredProductId },
          ],
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "productId",
          as: "reviews",
        },
      },
    ];

    const productWithReviews = await productCollection.aggregate(aggregationPipeline).toArray();

    if (productWithReviews.length === 0) {
        return res.status(404).send({ message: "Featured product not found." });
    }

    const response = {
      ...landingPageData,
      featuredProduct: productWithReviews[0],
    };

    res.status(200).send(response);
  } catch (error) {
    console.error("Error fetching landing page data:", error);
    if (error.name === 'BSONTypeError') {
        return res.status(400).send({ error: "Invalid featured product ID format." });
    }
    res.status(500).send({ error: "Internal Server Error" });
  }
};

module.exports = {
  getLandingPage,
  updateLandingPage,
};