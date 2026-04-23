// battalooda-upload.js
// Server-side upload handler

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'battalooda');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `battalooda-${timestamp}-${uniqueId}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/ogg;codecs=opus'
  ];
  
  console.log('Received file:', {
    mimetype: file.mimetype,
    originalname: file.originalname,
    size: file.size
  });
  
  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: fileFilter
});

// Upload endpoint
const handleUpload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file received',
        code: 'NO_FILE'
      });
    }

    const result = {
      success: true,
      message: 'Upload successful',
      file: {
        id: uuidv4(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/battalooda/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        duration: req.body.duration || 0,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log('Upload successful:', result.file);

    res.json(result);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during upload',
      code: 'SERVER_ERROR'
    });
  }
};

// Error handler
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large (max 50MB)',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'INVALID_FILE'
    });
  }
  
  next();
};

module.exports = {
  upload: upload.single('audio_data'),
  handleUpload,
  handleUploadError
};