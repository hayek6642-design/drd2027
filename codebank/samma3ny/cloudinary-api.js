// Enhanced Cloudinary API with pagination support
const cloudinary = require('./cloudinary-config');

/**
 * Enhanced function to fetch ALL tracks with comprehensive pagination
 * This ensures we get every single song, regardless of the total count
 */
async function getAllTracks(nextCursor = null, folderPrefix = 'media-player/') {
    const options = {
        resource_type: 'video',   // Cloudinary uses 'video' for audio files
        type: 'upload',
        prefix: folderPrefix,     // Flexible folder prefix (can be 'media-player/' or 'samma3ny/')
        max_results: 500,         // High limit per page for efficiency
        ...(nextCursor && { next_cursor: nextCursor }) // Include cursor if provided
    };

    try {
        console.log(`🔄 Fetching tracks${nextCursor ? ` (cursor: ${nextCursor})` : ''}...`);
        
        // Add retry logic for connection issues
        let attempts = 0;
        const maxAttempts = 3;
        let result;
        
        while (attempts < maxAttempts) {
            try {
                result = await cloudinary.api.resources(options);
                break; // Success, exit retry loop
            } catch (retryError) {
                attempts++;
                console.warn(`⚠️ Attempt ${attempts} failed: ${retryError.message}`);
                
                if (attempts >= maxAttempts) {
                    throw retryError;
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
            }
        }
        
        const tracks = result.resources || [];
        
        console.log(`✅ Page received: ${tracks.length} tracks`);
        console.log(`📊 Current total: ${tracks.length} tracks`);
        
        // Check if there are more pages
        if (result.next_cursor) {
            console.log(`➡️ More pages available, fetching next...`);
            const moreTracks = await getAllTracks(result.next_cursor, folderPrefix);
            const allTracks = tracks.concat(moreTracks);
            console.log(`🎵 Final total after pagination: ${allTracks.length} tracks`);
            return allTracks;
        } else {
            console.log(`🏁 Final total (no more pages): ${tracks.length} tracks`);
            return tracks;
        }
    } catch (error) {
        console.error("❌ Error fetching tracks from Cloudinary after all attempts:", error.message);
        // Return empty array on error to prevent crashes
        return [];
    }
}

/**
 * Fetch tracks from specific folder with pagination
 */
async function getTracksFromFolder(folderName = 'media-player', includeSubfolders = true) {
    const prefix = includeSubfolders ? `${folderName}/` : folderName;
    console.log(`📁 Fetching tracks from folder: ${prefix}`);
    return await getAllTracks(null, prefix);
}

/**
 * Get track count without fetching all data
 */
async function getTrackCount(folderPrefix = 'media-player/') {
    try {
        const options = {
            resource_type: 'video',
            type: 'upload',
            prefix: folderPrefix,
            max_results: 1, // Just need one record to get the count
            ...(folderPrefix && { prefix: folderPrefix })
        };
        
        const result = await cloudinary.api.resources(options);
        return result.total_count || 0;
    } catch (error) {
        console.error("❌ Error getting track count:", error.message);
        return 0;
    }
}

/**
 * Search tracks by metadata
 */
async function searchTracks(searchQuery, folderPrefix = 'media-player/') {
    try {
        const options = {
            resource_type: 'video',
            type: 'upload',
            prefix: folderPrefix,
            max_results: 100,
            ...(searchQuery && { 
                // Note: Cloudinary search API is separate, this is a basic implementation
                // For advanced search, you'd use cloudinary.search.api instead
                prefix: `${folderPrefix}${searchQuery}`
            })
        };
        
        const result = await cloudinary.api.resources(options);
        return result.resources || [];
    } catch (error) {
        console.error("❌ Error searching tracks:", error.message);
        return [];
    }
}

/**
 * Get track details by public_id
 */
async function getTrackDetails(publicId) {
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: 'video'
        });
        return result;
    } catch (error) {
        console.error(`❌ Error getting track details for ${publicId}:`, error.message);
        return null;
    }
}

// Export all functions
module.exports = {
    getAllTracks,
    getTracksFromFolder,
    getTrackCount,
    searchTracks,
    getTrackDetails
};