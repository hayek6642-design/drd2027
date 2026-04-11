# 👑 Farragna Admin Dashboard - Complete Guide

## 🔐 Access Admin Dashboard

### Method 1: Secret 7-Click Trigger
1. **Click the "🎬 Farragna" title in the header 7 times**
2. Title will turn **#ff2b54 (pink)** after 3 clicks
3. On 7th click, a **password modal** appears
4. **Password:** `doitasap2025`
5. After verification, admin dashboard opens

### Method 2: Direct Access (if integrated)
- Admin users can have direct dashboard link
- Requires authentication

**Note:** The 7-click counter resets after 5 seconds of inactivity

---

## 📊 Admin Dashboard Features

### 1️⃣ **STATISTICS TAB**
Real-time platform metrics:

#### Key Metrics
- **Total Users** - All registered users
- **Total Videos** - All uploaded videos
- **Published** - Active videos
- **Total Likes** - Sum of all video likes
- **Total Comments** - Sum of all comments
- **Total Shares** - Sum of all shares
- **Active Users** - Currently online
- **Restricted Content** - Videos under review/restriction

#### Additional Data
- **User Growth** - Daily/Weekly/Monthly growth rates
- **Content Status** - Published/Processing/Flagged breakdown
- **Top Videos** - Trending videos by engagement
- **Top Creators** - Most popular creators by likes

---

### 2️⃣ **USERS TAB**
Complete user management system:

#### User List
View all users with:
- **User ID** - Unique identifier
- **Name** - Display name
- **Videos** - Total videos uploaded
- **Likes** - Total likes received
- **Followers** - Follower count
- **Status** - Active/Restricted

#### User Actions
- **Restrict User** 🚫
  - Hides user's profile
  - Hides all their videos
  - Prevents new uploads
  - Can be reversed

- **Unrestrict User** ✅
  - Restores full access
  - Restores all content visibility
  - Re-enables uploading

#### Restricted Users Section
- Dedicated table for restricted users
- Shows restriction reason
- One-click unrestriction

#### User Search
- Real-time search by name/ID
- Filter active/restricted
- Quick sorting

---

### 3️⃣ **CONTENT TAB**
Content moderation and management:

#### Content List
View all videos with:
- **Video ID** - Unique identifier
- **Title** - Video title
- **Creator** - Uploader ID
- **Status** - Active/Restricted
- **Engagement** - Likes + Comments + Shares

#### Content Actions
- **Restrict Content** 🚫
  - Hides video from feed
  - Prevents sharing
  - Stays in user's library (private)
  - Can be reversed

- **Unrestrict Content** ✅
  - Restores to public feed
  - Re-enables sharing

- **Delete Content** 🗑️
  - Permanent deletion
  - Cannot be undone
  - Logs deletion reason

#### Content Filters
- **All Content** - Show everything
- **Active** - Only public videos
- **Restricted** - Only hidden/flagged

---

### 4️⃣ **BULK UPLOAD TAB**
Upload multiple videos at once:

#### How to Use
1. **Drag & drop** multiple video files OR click to select
2. **Max 50 videos** per bulk upload
3. **Max 500MB** per video
4. Files display in queue with size
5. Click **"Upload All Files"** to start
6. Progress bar shows upload status
7. Results summary when complete

#### File Requirements
- Format: MP4, WebM, OGG, etc.
- Size: 0.1MB - 500MB
- Supports batch titles/descriptions

#### Upload Results
- **Successful uploads** ✅ with green indicator
- **Failed uploads** ❌ with error details
- **Retry option** for failed files
- **Summary report** at completion

#### Performance Notes
- Uploads process sequentially
- Each file compressed automatically
- Thumbnails generated on-the-fly
- ~2-3 minutes per 100MB total

---

## 🎯 Moderation Workflows

### Workflow 1: Restrict a User
```
Users Tab → Find User → Click "Restrict" 
→ User cannot upload/interact 
→ All their videos hidden 
→ Use "Unrestrict" to restore
```

### Workflow 2: Restrict Content
```
Content Tab → Find Video → Click "Restrict"
→ Video hidden from feed
→ Creator keeps video in library
→ Others cannot see/share
→ Use "Unrestrict" to restore
```

### Workflow 3: Delete Harmful Content
```
Content Tab → Find Video → Click "Delete"
→ Confirm deletion dialog
→ Video permanently removed
→ Creator loses the video
→ ⚠️ Cannot be undone
```

### Workflow 4: Bulk Upload Videos
```
Bulk Upload Tab → Drag & drop files 
→ Select all → Click "Upload All Files"
→ Watch progress
→ Review results
→ Check Statistics tab
```

---

## 📈 Dashboard Insights

### User Metrics
- **Follower/Following** - Network size
- **Total Likes** - Content quality indicator
- **Join Date** - User tenure
- **Last Active** - Engagement level

### Content Metrics
- **Engagement Rate** - Likes + Comments + Shares
- **View Count** - Video reach
- **Duration** - Video length
- **Visibility** - Public/Private/Friends

### Platform Health
- **User Growth Rate** - New users/day/week/month
- **Upload Rate** - Videos/day
- **Average Engagement** - Per video
- **Content Status** - % published/processing/restricted

---

## 🔒 Security Features

### Password Protection
- Admin access requires password
- Password hashing (can be implemented)
- Failed login tracking
- Session timeout (30 mins recommended)

### Audit Trail
- Log all admin actions
- Track who restricted what user/content
- Record timestamps
- Store in browser localStorage or server

### Rate Limiting
- Prevent bulk deletion
- Confirmation dialogs for destructive actions
- One-click undo (future feature)

---

## ⚙️ Configuration

### Password
Located in `farragna-admin.js`:
```javascript
AdminAuth.ADMIN_PASSWORD = 'doitasap2025'
```

### Click Threshold
```javascript
AdminAuth.CLICK_THRESHOLD = 7  // Changes number of clicks needed
```

### Click Timeout
```javascript
AdminAuth.clickResetTimeout = 5000  // 5 seconds (ms)
```

---

## 🚀 Features Coming Soon

- [ ] Two-factor authentication (2FA)
- [ ] Role-based admin levels (Super Admin/Moderator/Viewer)
- [ ] Content appeals system
- [ ] User warning system (before restriction)
- [ ] Automated moderation (AI content detection)
- [ ] Detailed audit logs
- [ ] Ban/Timeout durations
- [ ] Community guidelines enforcement
- [ ] Report management dashboard
- [ ] Analytics export (CSV/PDF)

---

## 📝 Admin Checklist

### Daily Tasks
- [ ] Review flagged content
- [ ] Check restricted users for appeals
- [ ] Monitor platform statistics
- [ ] Respond to moderation reports

### Weekly Tasks
- [ ] Review user growth trends
- [ ] Check top creators
- [ ] Analyze engagement metrics
- [ ] Plan content guidelines updates

### Monthly Tasks
- [ ] Generate usage reports
- [ ] Review moderation trends
- [ ] Update banned content list
- [ ] Team meeting notes

---

## 🆘 Troubleshooting

### Can't Access Admin Dashboard?
1. Ensure you're clicking the **exact title text** (🎬 Farragna)
2. Click **7 times total** (not 7 clicks per second)
3. Wait 2-3 seconds between clicks for feedback
4. Check browser console for errors (F12)

### Password Not Working?
1. Verify exact password: `doitasap2025`
2. Check for spaces/typos
3. Ensure Caps Lock is OFF
4. Clear browser cache and try again

### Dashboard Not Loading?
1. Check internet connection
2. Verify browser supports ES6 modules
3. Check browser console for JavaScript errors
4. Try different browser (Chrome/Firefox/Safari)

### Statistics Not Updating?
1. Refresh page (Ctrl+R)
2. Clear browser cache
3. Check localStorage isn't full
4. Verify videos are uploaded to localStorage

---

## 📞 Support

For issues or feature requests:
- Check browser console (F12 → Console tab)
- Verify localStorage data: `localStorage.getItem('farragna:videos')`
- Review error messages in password modal
- Check network tab for failed requests

---

## 🔑 Key Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Admin | Click "Farragna" title 7× |
| Enter Password | Type + Enter |
| Close Dashboard | Click "Close" button |
| Search Users | Ctrl+F in Users tab |
| Scroll Tables | Arrow keys or scroll wheel |

---

## 📊 Data Storage

All data stored in **browser localStorage**:
- `farragna:videos` - All videos
- `farragna:profile:{userId}` - User profiles
- `farragna:bulk_progress` - Upload progress
- `farragna:interactions` - Likes/comments/shares

**Browser DevTools:** F12 → Application → LocalStorage

---

## 🎓 Best Practices

### Content Moderation
1. ✅ Always review before restricting
2. ✅ Document reason for restriction
3. ✅ Check for appeals after 30 days
4. ✅ Use escalation levels gradually
5. ❌ Avoid permanent bans for first offense

### User Management
1. ✅ Warn users before restriction
2. ✅ Provide clear reasons
3. ✅ Allow appeals process
4. ✅ Document all interactions
5. ❌ Don't restrict without evidence

### Uploads
1. ✅ Bulk upload during off-peak hours
2. ✅ Monitor progress in real-time
3. ✅ Check results after completion
4. ✅ Organize by category/date
5. ❌ Don't upload malformed files

---

**Version:** 1.0.0  
**Last Updated:** 2026  
**Admin Level:** Super Admin (All Features)
