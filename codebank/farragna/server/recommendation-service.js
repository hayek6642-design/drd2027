import { storage } from "./storage";
import { VIDEO_CATEGORIES, ENGAGEMENT_TYPES } from "./config";

class RecommendationService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes cache
  }

  async getTrendingVideos(limit = 20) {
    const cacheKey = `trending-${limit}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    // Get videos with most engagement in last 24 hours
    const videos = await storage.getVideos({ status: 'ready' });

    // Calculate engagement score
    const scoredVideos = videos.map(video => {
      const engagementScore =
        (video.views || 0) * 0.1 +
        (video.likes || 0) * 1 +
        (video.superLikes || 0) * 5 +
        (video.megaLikes || 0) * 25;

      // Add time decay factor (newer videos get boost)
      const hoursOld = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60);
      const timeFactor = Math.max(0, 1 - (hoursOld / 24)); // Decay over 24 hours

      return {
        ...video,
        engagementScore: engagementScore * (1 + timeFactor)
      };
    });

    // Sort by engagement score
    const trending = scoredVideos
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);

    this.cache.set(cacheKey, {
      data: trending,
      timestamp: Date.now()
    });

    return trending;
  }

  async getRecommendedVideos(userId, limit = 20) {
    const cacheKey = `recommended-${userId}-${limit}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    // Get user's engagement history
    const engagements = await storage.getEngagementsByUser(userId);

    if (engagements.length === 0) {
      // If no engagement history, return trending videos
      return this.getTrendingVideos(limit);
    }

    // Get categories user engages with most
    const categoryScores = {};
    for (const engagement of engagements) {
      const video = await storage.getVideoById(engagement.videoId);
      if (video) {
        const points = ENGAGEMENT_TYPES[engagement.type]?.points || 1;
        categoryScores[video.category] = (categoryScores[video.category] || 0) + points;
      }
    }

    // Get top categories
    const topCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    // Get videos from top categories
    const allVideos = await storage.getVideos({ status: 'ready' });
    const recommended = allVideos
      .filter(video => topCategories.includes(video.category))
      .sort((a, b) => {
        // Boost videos from top categories
        const aBoost = topCategories.includes(a.category) ? 2 : 1;
        const bBoost = topCategories.includes(b.category) ? 2 : 1;

        // Calculate recommendation score
        const aScore = ((a.views || 0) * 0.1 + (a.likes || 0) * 1) * aBoost;
        const bScore = ((b.views || 0) * 0.1 + (b.likes || 0) * 1) * bBoost;

        return bScore - aScore;
      })
      .slice(0, limit);

    this.cache.set(cacheKey, {
      data: recommended,
      timestamp: Date.now()
    });

    return recommended;
  }

  async getRelatedVideos(videoId, limit = 10) {
    const cacheKey = `related-${videoId}-${limit}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    const sourceVideo = await storage.getVideoById(videoId);
    if (!sourceVideo) {
      return [];
    }

    // Get videos from same category
    const allVideos = await storage.getVideos({
      category: sourceVideo.category,
      status: 'ready'
    });

    const related = allVideos
      .filter(video => video.id !== videoId)
      .sort((a, b) => {
        // Boost videos with similar engagement patterns
        const aScore = (a.views || 0) * 0.5 + (a.likes || 0) * 2;
        const bScore = (b.views || 0) * 0.5 + (b.likes || 0) * 2;
        return bScore - aScore;
      })
      .slice(0, limit);

    this.cache.set(cacheKey, {
      data: related,
      timestamp: Date.now()
    });

    return related;
  }

  async getForYouFeed(userId, limit = 20) {
    // Personalized feed algorithm
    const trending = await this.getTrendingVideos(limit * 2);
    const recommended = await this.getRecommendedVideos(userId, limit * 2);

    // Combine and deduplicate
    const combined = [...trending, ...recommended];
    const uniqueVideos = Array.from(new Map(combined.map(video => [video.id, video])).values());

    // Sort by a mix of engagement and personalization
    return uniqueVideos
      .sort((a, b) => {
        const aScore = this.calculateFeedScore(a, userId);
        const bScore = this.calculateFeedScore(b, userId);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  async calculateFeedScore(video, userId) {
    // Base score from engagement
    let score = (video.views || 0) * 0.1 +
                (video.likes || 0) * 1 +
                (video.superLikes || 0) * 5 +
                (video.megaLikes || 0) * 25;

    // Time decay (newer videos get boost)
    const hoursOld = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.max(0.5, 1 - (hoursOld / 48)); // Decay over 48 hours
    score *= timeFactor;

    // Personalization boost if user has engaged with similar content
    if (userId) {
      const userEngagements = await storage.getEngagementsByUser(userId);
      const userCategories = new Set(
        (await Promise.all(userEngagements.map(async (e) => {
          const v = await storage.getVideoById(e.videoId);
          return v?.category;
        }))).filter(Boolean)
      );

      if (userCategories.has(video.category)) {
        score *= 1.5; // 50% boost for preferred categories
      }
    }

    return score;
  }
}

export const recommendationService = new RecommendationService();