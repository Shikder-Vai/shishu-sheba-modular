const client = require("../config/db");
const youtubeCollection = client.db("sishuSheba").collection("youtube");
const { ObjectId } = require('mongodb');

// Get all YouTube videos
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await youtubeCollection.find().toArray();
    res.status(200).json({
      success: true,
      videos: videos
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos',
      error: error.message
    });
  }
};

// Add a new YouTube video
exports.addVideo = async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'URL is required'
    });
  }

  try {
    const result = await youtubeCollection.insertOne({
      url: url,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      video: {
        _id: result.insertedId,
        url: url
      }
    });
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add video',
      error: error.message
    });
  }
};

// Update a YouTube video by ID
exports.updateVideo = async (req, res) => {
  const { id } = req.params;
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'URL is required'
    });
  }

  try {
    const result = await youtubeCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { url: url, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      id: id,
      url: url
    });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: error.message
    });
  }
};

// Delete a YouTube video by ID
exports.deleteVideo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await youtubeCollection.deleteOne({ _id: new ObjectId(id) });
    console.log(result);
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
};