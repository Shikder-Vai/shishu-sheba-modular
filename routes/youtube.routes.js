const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtube.controller');

// GET /v1/youtube - Get all videos
router.get('/', youtubeController.getAllVideos);

// POST /v1/youtube - Add new video
router.post('/', youtubeController.addVideo);

// PUT /v1/youtube/:id - Update video by ID
router.put('/:id', youtubeController.updateVideo);

// DELETE /v1/youtube/:id - Delete video by ID
router.delete('/:id', youtubeController.deleteVideo);

module.exports = router;