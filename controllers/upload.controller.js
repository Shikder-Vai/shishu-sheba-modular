const uploadLandingPageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded." });
    }
    const imageUrl = `${process.env.IMG_UPLOAD_URL}/landing-pages/${req.file.filename}`;
    res.status(200).send({ imageUrl });
  } catch (error) {
    console.error("Error uploading landing page image:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded." });
    }
    const imageUrl = `${process.env.IMG_UPLOAD_URL}/banners/${req.file.filename}`;
    res.status(200).send({ imageUrl });
  } catch (error) {
    console.error("Error uploading banner image:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const uploadReviewImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded." });
    }
    const imageUrl = `${process.env.IMG_UPLOAD_URL}/reviews/${req.file.filename}`;
    res.status(200).send({ imageUrl });
  } catch (error) {
    console.error("Error uploading review image:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded." });
    }
    const imageUrl = `${process.env.IMG_UPLOAD_URL}/products/${req.file.filename}`;
    res.status(200).send({ imageUrl });
  } catch (error) {
    console.error("Error uploading product image:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

module.exports = {
  uploadLandingPageImage,
  uploadBannerImage,
  uploadReviewImage,
  uploadProductImage,
};
