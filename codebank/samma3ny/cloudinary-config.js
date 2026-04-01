// Cloudinary Configuration
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhpyneqgk',
    api_key: process.env.CLOUDINARY_API_KEY || '799518422494748',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'zfSbK0-zK3tHdmCWdcCduPcxtU4'
});

console.log('🔧 Cloudinary configured with:', {
    cloud_name: cloudinary.config().cloud_name,
    has_api_key: !!cloudinary.config().api_key,
    has_api_secret: !!cloudinary.config().api_secret
});

module.exports = cloudinary;