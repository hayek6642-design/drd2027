import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_TOKEN } from "./config.js";

class CloudflareStreamService {
  constructor() {
    this.accountId = CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = CLOUDFLARE_STREAM_TOKEN;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;
  }

  async createDirectUploadUrl() {
    try {
      const response = await fetch(`${this.baseUrl}/direct_upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600, // 1 hour max
          allowedOrigins: ['*'] // Allow all origins for development
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudflare Stream API error: ${errorData.errors.map(e => e.message).join(', ')}`);
      }

      const data = await response.json();
      return {
        uploadUrl: data.result.uploadURL,
        videoId: data.result.uid,
        playbackUrl: `https://customer-${this.accountId}.cloudflarestream.com/${data.result.uid}/manifest/video.m3u8`
      };
    } catch (error) {
      console.error('Error creating Cloudflare direct upload URL:', error);
      throw error;
    }
  }

  async getVideoDetails(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudflare Stream API error: ${errorData.errors.map(e => e.message).join(', ')}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Cloudflare video details:', error);
      throw error;
    }
  }

  async deleteVideo(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudflare Stream API error: ${errorData.errors.map(e => e.message).join(', ')}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting Cloudflare video:', error);
      throw error;
    }
  }

  async getVideoStatus(videoId) {
    try {
      const response = await fetch(`${this.baseUrl}/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudflare Stream API error: ${errorData.errors.map(e => e.message).join(', ')}`);
      }

      const data = await response.json();
      return data.result.status;
    } catch (error) {
      console.error('Error getting Cloudflare video status:', error);
      throw error;
    }
  }
}

export const cloudflareStream = new CloudflareStreamService();