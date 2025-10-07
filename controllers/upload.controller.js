const uploadLandingPageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded." });
    }

    // The file is uploaded, and the path is available in req.file.path
    // We need to return the public path to the image, not the absolute path.
    const publicPath = `/uploads/landing-pages/${req.file.filename}`;

    res.status(200).send({ imageUrl: publicPath });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

module.exports = {
  uploadLandingPageImage,
};
