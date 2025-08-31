const { ObjectId } = require("mongodb");
const client = require("../config/db");

const bannersCollection = client.db("sishuSheba").collection("banners");

exports.getBanners = async (req, res) => {
  try {
    let banners = await bannersCollection.find().toArray();

    if (banners.length === 0) {
      const defaultBanners = [
        {
          position: 1,
          image: "https://via.placeholder.com/1200x400?text=Banner+1",
        },
        {
          position: 2,
          image: "https://via.placeholder.com/1200x400?text=Banner+2",
        },
        {
          position: 3,
          image: "https://via.placeholder.com/1200x400?text=Banner+3",
        },
      ];

      const result = await bannersCollection.insertMany(defaultBanners);
      banners = defaultBanners.map((banner, index) => ({
        ...banner,
        _id: result.insertedIds[index],
      }));
    }

    res.send(banners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).send({ error: "Internal server error" });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid banner ID" });
    }

    if (!image || typeof image !== "string") {
      return res.status(400).send({ error: "Valid image URL is required" });
    }

    const result = await bannersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { image } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Banner not found" });
    }

    res.send({
      success: true,
      modifiedCount: result.modifiedCount,
      message: "Banner updated successfully",
    });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).send({ error: "Internal server error" });
  }
};
