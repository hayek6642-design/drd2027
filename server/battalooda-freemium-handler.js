// battalooda-freemium-handler.js
// Minimal cloud handler - only used when user wants to share

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Temp storage only
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({
  dest: tempDir,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max (1 min audio ~ 1-2MB)
});

// Cloudinary upload (only when sharing)
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const handler = {
  // Upload to cloud (only when user clicks share)
  uploadToCloud: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file' });
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'video', // Audio uses video type
        folder: 'battalooda/freemium',
        public_id: `battalooda_${Date.now()}`,
        eager: [{ audio_codec: 'mp3', bit_rate: '128k' }]
      });

      // Cleanup temp
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        recording: {
          url: result.secure_url,
          public_id: result.public_id,
          provider: 'cloudinary',
          duration: req.body.duration
        }
      });

    } catch (error) {
      console.error('Cloud upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Delete from cloud
  deleteFromCloud: async (req, res) => {
    try {
      const { publicId } = req.body;
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = {
  upload: upload.single('audio_data'),
  handler
};