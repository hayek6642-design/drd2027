/**
 * Samma3ny API Middleware - Fixes song loading issues
 * This middleware ensures Samma3ny properly loads songs from Cloudinary
 * by prioritizing the correct folders where songs are actually stored
 */

import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

// Configure environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhpyneqgk',
  api_key: process.env.CLOUDINARY_API_KEY || '799518422494748',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'zfSbK0-zK3tHdmCWdcCduPcxtU4'
});

/**
 * Enhanced Samma3ny songs API handler
 * This fixes the issue where Samma3ny was looking for songs in wrong folders
 */
export async function handleSamma3nySongs(req, res) {
  try {
    console.log('🔍 [FIXED] Fetching Samma3ny songs with corrected folder search...');
    console.log('Cloudinary config:', {
      cloud_name: cloudinary.v2.config().cloud_name,
      api_key: cloudinary.v2.config().api_key ? '***' + cloudinary.v2.config().api_key.slice(-4) : 'not set'
    });

    // FIXED: Prioritize media-player folder first since that's where songs are actually stored
    const folderPrefixes = ['media-player/', 'media-player', 'samma3ny/', 'samma3ny', '', 'root'];

    let allResources = [];

    for (const prefix of folderPrefixes) {
      try {
        console.log(`🔍 Checking folder: "${prefix || 'root'}" with full pagination`);

        let nextCursor = null;
        let folderResources = [];
        let pageCount = 0;

        do {
          pageCount++;
          console.log(`📄 Fetching page ${pageCount} for folder "${prefix || 'root'}"${nextCursor ? ` (cursor: ${nextCursor})` : ''}`);

          const params = {
            resource_type: 'video',
            ...(prefix && { prefix }),
            type: 'upload',
            max_results: 500
          };

          if (nextCursor) {
            params.next_cursor = nextCursor;
          }

          const response = await cloudinary.v2.api.resources(params);
          const resources = response.resources || [];
          console.log(`📁 Page ${pageCount}: Found ${resources.length} resources in "${prefix || 'root'}" folder`);

          if (resources.length > 0) {
            // Filter for audio files only
            const audioFiles = resources.filter(resource =>
              resource.format && ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(resource.format.toLowerCase())
            );
            console.log(`🎵 Page ${pageCount}: Found ${audioFiles.length} audio files in "${prefix || 'root'}" folder`);
            folderResources = folderResources.concat(audioFiles);
          }

          nextCursor = response.next_cursor;
          console.log(`🔄 Next cursor: ${nextCursor ? nextCursor.substring(0, 20) + '...' : 'none'}`);

        } while (nextCursor);

        console.log(`✅ Folder "${prefix || 'root'}" completed: ${folderResources.length} total audio files across ${pageCount} pages`);
        allResources = allResources.concat(folderResources);

      } catch (folderError) {
        console.warn(`⚠️ Error checking folder "${prefix}":`, folderError.message);
      }
    }

    // Remove duplicates based on public_id
    const uniqueResources = allResources.filter((resource, index, self) =>
      index === self.findIndex(r => r.public_id === resource.public_id)
    );

    console.log(`✅ Total unique audio resources found: ${uniqueResources.length}`);

    if (uniqueResources.length > 0) {
      console.log('Sample resource:', uniqueResources[0]);
      res.json(uniqueResources);
    } else {
      console.log('❌ No audio files found in any folder');
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Cloudinary API error for Samma3ny:', error.message);
    console.error('Full error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      message: 'Failed to load Samma3ny songs. Please check Cloudinary configuration.'
    });
  }
}

// Export the handler
export default handleSamma3nySongs;