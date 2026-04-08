# بطلودة (Battalooda) - VoiceShare Platform

## Overview
Battalooda is a voice talent discovery platform integrated within the CodeBank ecosystem. It allows users to record their voices over royalty-free music tracks and share them with the community.

## Features

### 🎙️ Live Recording
- **Pure Voice Recording**: Record without any background music
- **Karaoke Mode**: Record with royalty-free instrumental tracks
- **Real-time Audio Visualization**: Live waveform display during recording
- **3-Minute Limit**: Maximum recording duration

### 🎵 Music Library
- **Jamendo Integration**: Access to thousands of royalty-free tracks
- **Local Library**: Curated collection of pre-approved tracks
- **Category-Based**: Music organized by genre and mood
- **Search & Filter**: Find tracks by title, artist, or tags

### 📱 Social Features
- **Likes & Comments**: Community feedback system
- **Category System**: Quran, Singing, and Christian categories
- **User Profiles**: Display user information and recordings
- **Sharing**: Share recordings across social media

### 🔒 Security & Quality
- **Live Recording Only**: No file uploads to prevent manipulation
- **WebRTC Audio**: Direct browser recording
- **Mixed Audio Output**: Professional-quality voice + music combination

## Technical Architecture

### Frontend
- **HTML5**: Semantic markup with RTL support
- **CSS3**: Dark theme with glassmorphism effects
- **JavaScript ES6+**: Modern async/await patterns
- **Web Audio API**: Professional audio processing
- **MediaRecorder API**: Browser-based recording

### Backend
- **Node.js/Express**: RESTful API endpoints
- **SQLite**: Local database storage
- **Multer**: File upload handling
- **Session-based Auth**: User authentication

### Database Schema
```sql
-- Recordings table
CREATE TABLE battalooda_recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT CHECK(category IN ('quran', 'singing', 'christian')),
    audio_path TEXT NOT NULL,
    has_music BOOLEAN DEFAULT 0,
    music_track_id TEXT,
    music_track_info TEXT,
    duration INTEGER,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Likes table
CREATE TABLE battalooda_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recording_id, user_id)
);

-- Comments table
CREATE TABLE battalooda_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## File Structure
```
codebank/battalooda/
├── battalooda.html                 # Main entry point
├── css/
│   └── battalooda.css             # All styling
├── js/
│   ├── battalooda-core.js         # Main app logic
│   ├── audio-engine.js            # Recording & mixing
│   ├── music-library.js           # Jamendo/Karaoke API
│   └── social-features.js         # Likes, comments, shares
├── assets/
│   ├── icons/                     # UI icons
│   └── music/                     # Local music tracks
└── sql/
    └── schema.sql                 # Database schema
```

## Installation

### Prerequisites
- Node.js (v14+)
- CodeBank platform
- Web server with HTTPS (required for WebRTC)

### Setup
1. **Copy Files**: Place the battalooda directory in your CodeBank installation
2. **Database**: Run the SQL schema in `codebank/battalooda/sql/schema.sql`
3. **API Routes**: Add the routes from `api/routes/battalooda.js` to your Express app
4. **App Registry**: Battalooda is already registered in `codebank/js/app-registry.js`

### Configuration

#### Jamendo API
1. Get a Jamendo API key from [jamendo.com/admin/applications](https://jamendo.com/admin/applications)
2. Update `JAMENDO_CONFIG.clientId` in `codebank/battalooda/js/music-library.js`

#### Local Music
Add your royalty-free tracks to `codebank/battalooda/assets/music/` and update the `LOCAL_KARAOKE_LIBRARY` array in `music-library.js`.

## Usage

### For Users
1. **Open Battalooda**: Access through CodeBank app launcher
2. **Browse Feed**: View recordings by category
3. **Record**: Click the red mic button for live recording or orange music button for karaoke
4. **Share**: Upload and share your recordings with the community

### For Developers
1. **Extend Music Library**: Add new tracks to the local library
2. **Customize UI**: Modify CSS in `battalooda.css`
3. **Add Features**: Extend JavaScript modules as needed
4. **API Integration**: Use the provided REST endpoints

## API Endpoints

### Recording Management
- `GET /api/battalooda/feed?category=&page=` - Get recordings feed
- `POST /api/battalooda/upload` - Upload new recording
- `DELETE /api/battalooda/recording/:id` - Delete recording

### Social Features
- `POST /api/battalooda/like` - Like/unlike recording
- `GET /api/battalooda/comments?recordingId=` - Get comments
- `POST /api/battalooda/comment` - Add comment

### Music Library
- `GET /api/battalooda/music/search?q=&source=` - Search music
- `GET /api/battalooda/music/popular?category=` - Get popular tracks

## Browser Support
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Partial support (Web Audio API limitations)
- **Mobile Browsers**: Supported with touch optimizations

## Security Notes
- **HTTPS Required**: WebRTC requires secure context
- **CORS Headers**: Ensure proper CORS configuration for audio files
- **File Validation**: Audio files are validated on upload
- **User Authentication**: All actions require user authentication

## Troubleshooting

### Common Issues
1. **Microphone Access**: Ensure browser permissions are granted
2. **Audio Playback**: Check CORS headers for music files
3. **Recording Quality**: Use quality headphones for monitoring
4. **API Errors**: Verify Jamendo API key configuration

### Debug Mode
Enable debug logging by adding `?debug=true` to the URL.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a pull request

## License
This project is part of CodeBank and follows its licensing terms.

## Support
For issues and questions:
- Check the CodeBank documentation
- Review the API documentation
- Contact the development team

---

**Note**: This is a modified version of Battalooda that removes YouTube/Spleeter integration and focuses on legal, royalty-free music sources only.