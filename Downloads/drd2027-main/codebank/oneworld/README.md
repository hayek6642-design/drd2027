# 🌍 OneWorld - Global Social Platform

OneWorld is a comprehensive social media platform inspired by X (formerly Twitter), built with modern web technologies and designed for global connectivity. It features real-time interactions, multimedia support, and a fully responsive design.

## ✨ Features

### Core Social Features
- **Real-time Posts**: Create and share posts with text, images, and videos
- **Like & Repost**: Engage with content through likes and reposts
- **Follow System**: Follow users to see their posts in your feed
- **Comments & Replies**: Threaded conversations on posts
- **Bookmarks**: Save posts for later reading
- **Notifications**: Real-time notifications for interactions

### Advanced Features
- **Hashtags & Mentions**: Discover content and mention users
- **Search**: Find users, posts, and trending topics
- **User Profiles**: Complete profiles with bio, location, and website
- **Trending Topics**: See what's popular globally
- **Real-time Updates**: Live feed updates without page refresh
- **Mobile Responsive**: Optimized for all device sizes

### Technical Features
- **Real-time Communication**: Socket.io for instant updates
- **Secure Authentication**: Supabase Auth with JWT tokens
- **Scalable Database**: PostgreSQL with Row Level Security
- **File Storage**: Supabase Storage for media uploads
- **Modern UI**: Clean, Twitter-inspired interface
- **Progressive Web App**: Installable on mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Supabase account (free tier available)
- Modern web browser

### 1. Clone and Setup

```bash
cd services/codebank/oneworld
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL from `database-schema.sql` to create all tables
4. Enable Row Level Security (RLS) policies as needed
5. Create a storage bucket called `oneworld-media` with public access

### 5. Start the Backend

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:5000`

### 6. Frontend Setup

The frontend is ready to use! Simply open `index.html` in your browser or serve it with a local server:

```bash
# Using Python (if available)
python -m http.server 3000

# Or using Node.js
npx serve . -p 3000
```

Open `http://localhost:3000` in your browser.

## 📁 Project Structure

```
oneworld/
├── index.html              # Main frontend application
├── styles.css              # Complete styling system
├── app.js                  # Frontend JavaScript logic
├── supabase.js             # Supabase client configuration
├── database-schema.sql     # Database schema and setup
├── backend/                # Backend API server
│   ├── package.json
│   ├── src/
│   │   ├── server.js       # Express server setup
│   │   ├── config/
│   │   │   └── database.js # Database configuration
│   │   ├── middleware/
│   │   │   ├── auth.js     # Authentication middleware
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js     # Authentication routes
│   │   │   ├── posts.js    # Posts CRUD operations
│   │   │   ├── users.js    # User management
│   │   │   └── notifications.js
│   │   ├── services/
│   │   │   └── socketService.js # Real-time features
│   │   └── utils/
│   │       └── logger.js
│   └── .env.example
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile

### Posts
- `GET /api/posts/feed` - Get user's feed
- `GET /api/posts/user/:userId` - Get user's posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:postId` - Get single post
- `POST /api/posts/:postId/like` - Like/unlike post
- `POST /api/posts/:postId/repost` - Repost a post
- `POST /api/posts/:postId/bookmark` - Bookmark post

### Users
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/:userId/follow` - Follow user
- `DELETE /api/users/:userId/follow` - Unfollow user
- `GET /api/users/search` - Search users

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read

## 🎨 UI Components

### Main Layout
- **Sidebar**: Navigation menu with user info
- **Main Feed**: Posts timeline with composer
- **Right Sidebar**: Search, trending topics, suggested users
- **Modals**: Authentication, post composer, user profiles

### Post Features
- Rich text composer with character count
- Media upload (images/videos)
- Like, repost, reply, bookmark actions
- Threaded conversations
- Real-time like counts

### User Features
- Complete profile pages
- Follow/follower counts
- Profile editing
- Avatar and banner images

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API request throttling
- **CORS Protection**: Cross-origin request security
- **HTTPS Ready**: Production-ready security headers

## 📱 Mobile Optimization

- Responsive design for all screen sizes
- Touch-friendly interactions
- Optimized performance on mobile networks
- PWA capabilities for app-like experience

## 🚀 Deployment

### Backend Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Frontend Deployment
The frontend is static and can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

### Environment Variables for Production
```env
NODE_ENV=production
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
FRONTEND_URL=https://yourdomain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Basic social features
- ✅ Real-time updates
- ✅ User authentication
- ✅ Responsive design

### Phase 2 (Upcoming)
- Direct messaging
- Video calls
- Advanced search
- Analytics dashboard
- API for third-party integrations

### Phase 3 (Future)
- Mobile apps (React Native)
- Advanced moderation tools
- Business accounts
- Advertising platform

---

**Built with ❤️ for global connection and free expression**