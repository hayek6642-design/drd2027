// Cloudinary Client-Side Configuration
// Fixed configuration for browser environment

const CLOUDINARY_CONFIG = {
    cloud_name: 'dhpyneqgk',
    api_key: '799518422494748',
    upload_preset: 'media-player1'
};

// Initialize Cloudinary for client-side usage
if (typeof window !== 'undefined') {
    window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
    window.cloudinary = window.cloudinary || {};
    
    console.log('🌩️ Cloudinary client config loaded:', {
        cloud_name: CLOUDINARY_CONFIG.cloud_name,
        upload_preset: CLOUDINARY_CONFIG.upload_preset
    });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLOUDINARY_CONFIG;
}