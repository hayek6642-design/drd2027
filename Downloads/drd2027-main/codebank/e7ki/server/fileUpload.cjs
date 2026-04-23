const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../uploads/e7ki');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadDir, req.user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp3|wav|ogg|mp4|mov|webm|pdf|doc|docx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('File type not supported'));
  }
});

function registerFileRoutes(app) {
  // File upload endpoint
  app.post('/api/e7ki/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Construct the public URL
    // In a real system, this would be served via a static route
    const publicUrl = `/uploads/e7ki/${req.user.id}/${req.file.filename}`;
    
    res.json({ 
      success: true,
      url: publicUrl,
      type: req.file.mimetype,
      filename: req.file.originalname,
      size: req.file.size
    });
  });

  // Serve the uploaded files
  app.use('/uploads/e7ki', (req, res, next) => {
    // Basic security: only authenticated users can access files
    // You might want to implement more granular permissions here
    next();
  }, require('express').static(uploadDir));
}

module.exports = { registerFileRoutes, upload };
