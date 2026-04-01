/**
 * Farragna Video Feed Service
 * Integrates Pexels, Pixabay, and Mixkit APIs to provide thousands of videos
 * without requiring a database
 */

// API Keys from environment
const PEXELS_API_KEY = "kDjxr7NRc3ngSWoYkpFtYqJcoPFHi6lUM5hqBlgQxmYfVaoNDQWbxIjE";
const PIXABAY_API_KEY = "51193144-58166af266c808b2e75cfc735";

/**
 * Load videos from Pexels API
 */
async function loadPexelsVideos() {
  try {
    console.log("[Farragna] Loading Pexels videos...");
    
    const response = await fetch(
      "https://api.pexels.com/videos/popular?per_page=20",
      {
        headers: {
          Authorization: PEXELS_API_KEY,
          "User-Agent": "Farragna/1.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    
    const videos = data.videos.map(v => ({
      id: "pexels_" + v.id,
      url: v.video_files[0].link,
      caption: v.user.name || "Pexels",
      source: "Pexels",
      thumbnail: v.image
    }));

    console.log(`[Farragna] Pexels videos loaded: ${videos.length}`);
    return videos;
  } catch (error) {
    console.error("[Farragna] Failed to load Pexels videos:", error);
    return [];
  }
}

/**
 * Load videos from Pixabay API
 */
async function loadPixabayVideos() {
  try {
    console.log("[Farragna] Loading Pixabay videos...");
    
    const response = await fetch(
      `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&per_page=20`
    );

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    
    const videos = data.hits.map(v => ({
      id: "pixabay_" + v.id,
      url: v.videos.medium.url,
      caption: v.tags || "Pixabay",
      source: "Pixabay",
      thumbnail: v.preview
    }));

    console.log(`[Farragna] Pixabay videos loaded: ${videos.length}`);
    return videos;
  } catch (error) {
    console.error("[Farragna] Failed to load Pixabay videos:", error);
    return [];
  }
}

/**
 * Load videos from Mixkit public feeds
 */
async function loadMixkitVideos() {
  try {
    console.log("[Farragna] Loading Mixkit videos...");
    
    // Mixkit doesn't have a traditional API, using their public JSON feed
    const response = await fetch(
      "https://mixkit.co/api/videos/popular/?page=1&per_page=20"
    );

    if (!response.ok) {
      throw new Error(`Mixkit API error: ${response.status}`);
    }

    const data = await response.json();
    
    const videos = data.results.map(v => ({
      id: "mixkit_" + v.id,
      url: v.files.find(f => f.quality === 'sd')?.link || v.files[0].link,
      caption: v.title || "Mixkit",
      source: "Mixkit",
      thumbnail: v.thumbnail
    }));

    console.log(`[Farragna] Mixkit videos loaded: ${videos.length}`);
    return videos;
  } catch (error) {
    console.error("[Farragna] Failed to load Mixkit videos:", error);
    return [];
  }
}

/**
 * Normalize and combine videos from all sources
 */
function normalizeVideos(videos, source) {
  return videos.map(v => ({
    id: v.id,
    url: v.url,
    caption: v.caption,
    source: v.source,
    thumbnail: v.thumbnail || null
  }));
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Main function to load and combine all video feeds
 */
async function loadFarragnaFeed() {
  console.log("[Farragna] Loading video feed from all sources...");
  
  try {
    // Load from all APIs concurrently
    const [pexelsVideos, pixabayVideos, mixkitVideos] = await Promise.all([
      loadPexelsVideos(),
      loadPixabayVideos(),
      loadMixkitVideos()
    ]);

    // Combine all videos
    const allVideos = [
      ...normalizeVideos(pexelsVideos, 'Pexels'),
      ...normalizeVideos(pixabayVideos, 'Pixabay'),
      ...normalizeVideos(mixkitVideos, 'Mixkit')
    ];

    // Shuffle the combined feed
    const shuffledFeed = shuffleArray(allVideos);

    console.log(`[Farragna] Feed rendered with ${shuffledFeed.length} videos`);
    
    return shuffledFeed;
  } catch (error) {
    console.error("[Farragna] Failed to load video feed:", error);
    return [];
  }
}

/**
 * Render videos in Farragna vertical feed
 */
function renderFeed(videos) {
  const feedContainer = document.getElementById('farragna-feed') || 
                       document.querySelector('.farragna-feed') ||
                       document.body;

  if (!feedContainer) {
    console.error("[Farragna] Could not find feed container");
    return;
  }

  // Clear existing content
  feedContainer.innerHTML = '';

  videos.forEach(video => {
    const videoCard = document.createElement('div');
    videoCard.className = 'farragna-video-card';
    videoCard.style.marginBottom = '20px';
    videoCard.style.border = '1px solid #ccc';
    videoCard.style.borderRadius = '8px';
    videoCard.style.overflow = 'hidden';

    videoCard.innerHTML = `
      <video 
        src="${video.url}" 
        controls 
        preload="none"
        style="width: 100%; height: auto;"
        data-source="${video.source}"
        data-id="${video.id}"
      >
        Your browser does not support the video tag.
      </video>
      <div style="padding: 10px;">
        <h4>${video.caption}</h4>
        <p style="color: #666; font-size: 0.9em;">Source: ${video.source}</p>
      </div>
    `;

    feedContainer.appendChild(videoCard);
  });
}

/**
 * Handle user uploads by prepending to feed
 */
function prependUserVideo(videoData) {
  const feedContainer = document.getElementById('farragna-feed') || 
                       document.querySelector('.farragna-feed') ||
                       document.body;

  if (!feedContainer || !videoData.url) {
    console.error("[Farragna] Cannot prepend user video - invalid data or container");
    return;
  }

  const videoCard = document.createElement('div');
  videoCard.className = 'farragna-video-card user-upload';
  videoCard.style.marginBottom = '20px';
  videoCard.style.border = '2px solid #007bff';
  videoCard.style.borderRadius = '8px';
  videoCard.style.overflow = 'hidden';

  videoCard.innerHTML = `
    <video 
      src="${videoData.url}" 
      controls 
      preload="auto"
      style="width: 100%; height: auto;"
      data-source="User Upload"
      data-id="user_${Date.now()}"
    >
      Your browser does not support the video tag.
    </video>
    <div style="padding: 10px;">
      <h4>${videoData.caption || 'Your Upload'}</h4>
      <p style="color: #007bff; font-size: 0.9em; font-weight: bold;">User Upload</p>
    </div>
  `;

  // Insert at the beginning of the feed
  feedContainer.insertBefore(videoCard, feedContainer.firstChild);
  
  console.log("[Farragna] User video prepended to feed");
}

/**
 * Initialize Farragna feed on DOM load
 */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    loadFarragnaFeed().then(videos => {
      if (videos.length > 0) {
        renderFeed(videos);
      } else {
        console.warn("[Farragna] No videos loaded from any source");
      }
    });
  });
}

// Export functions for external use (Node.js compatibility)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadFarragnaFeed,
    renderFeed,
    prependUserVideo,
    loadPexelsVideos,
    loadPixabayVideos,
    loadMixkitVideos
  };
}

// Also make available globally for browser use
if (typeof window !== 'undefined') {
  window.FarragnaVideoFeed = {
    loadFarragnaFeed,
    renderFeed,
    prependUserVideo,
    loadPexelsVideos,
    loadPixabayVideos,
    loadMixkitVideos
  };
}
