# Farragna API Documentation

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header, except where noted.

## Endpoints

### Video Management
- `POST /api/farragna/upload/request` - Request upload URL from Cloudflare
- `POST /api/farragna/webhook/cloudflare` - Cloudflare webhook for video processing
- `GET /api/farragna/:id` - Get video details and playback URL
- `GET /api/farragna/feed` - Get paginated feed (public)
- `GET /api/farragna/trending` - Get trending videos (public)
- `POST /api/farragna/upload` - Bulk upload videos
- `POST /api/farragna/upload/simple` - Simple single video upload (returns {success: true, url: "..."})

### Social Features
- `POST /api/farragna/:id/like` - Toggle like on video
- `GET /api/farragna/:id/likes` - Get like count and user like status
- `POST /api/farragna/:id/comments` - Add comment to video
- `GET /api/farragna/:id/comments` - Get paginated comments (public)

### User Features
- `POST /api/farragna/users/:id/follow` - Follow/unfollow user
- `GET /api/farragna/users/:id/followers` - Get user's followers (public)

### Search & Discovery
- `GET /api/farragna/search?q={query}&type=[videos|users|hashtags]` - Search videos/users/hashtags

### Profiles
- `GET /api/farragna/users/:id` - Get user profile with stats
- `GET /api/farragna/users/:id/videos` - Get user's videos
- `PUT /api/farragna/profile` - Update user profile

## Response Format
All responses follow:
```json
{
  "success": boolean,
  "data": {},
  "error": string,
  "meta": { "page": number, "limit": number, "total": number }
}
```

## Rate Limits
- Uploads: 5 per hour per user
- File size: 100MB max
- Supported formats: MP4, MOV, WebM