# SafeCode Asset Transfer Tracking — Implementation Guide

## 🎯 Overview

This implementation adds **visual indicators** for transferred assets in the SafeCode vault interface, with color-coded display based on asset source:

- 🔵 **Cyan (#00d4ff)** — Self-generated assets
- 🟠 **Orange (#ff9930)** — Assets received from users
- 🔴 **Red (#ff4444)** — Assets received from admins

## 📦 Files to Deploy

### 1. Database Schema
**File:** `database/transfer-schema.sql`  
**Purpose:** Add columns to track asset source and transfer metadata

**Deployment:**
```bash
# Apply schema updates to your database
psql -U your_user -d your_database -f database/transfer-schema.sql
```

**What it does:**
- Adds `source_type`, `source_email`, `transferred_at`, `transferred_from_email` columns to:
  - `codes` table
  - `silver_assets` table
  - `gold_assets` table
- Creates `asset_transfers` table for complete transfer history
- Adds indices for fast queries

### 2. Transfer API Routes
**File:** `server/routes/transfer-api.js`  
**Purpose:** Handle asset transfers between users and admins

**Key Endpoints:**
```
POST /api/assets/transfer           — User-to-user transfer
POST /api/assets/admin-send         — Admin-to-user transfer
GET  /api/assets/history            — Transfer history
GET  /api/assets/sync               — Assets with source info
GET  /api/assets/:type/stats        — Source statistics
```

**Deployment:**
```bash
# Copy file to server directory
cp transfer-api.js server/routes/

# Register in your main Express app (e.g., server.js)
const transferAPI = require('./routes/transfer-api');
app.use('/api/assets', transferAPI);
```

### 3. Enhanced SafeCode UI
**File:** `codebank/safecode/index.html` (update existing)  
**Purpose:** Display assets with color-coded indicators

**Integration:**
1. Open your current `codebank/safecode/index.html`
2. Replace the `<div class="sf-interior">` section with the enhanced version
3. Add the CSS styles for transfer indicators
4. Add the JavaScript functions for transfer history

**Features Added:**
- Transfer source badges (Self, From User, From Admin)
- Color-coded asset values
- Transfer statistics summary
- Transfer history modal with detailed information
- Hover tooltips showing transfer origin

## 🔧 Integration Steps

### Step 1: Update Database Schema
```sql
-- SSH/Terminal access to your database host
psql -c "
ALTER TABLE codes ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'self';
ALTER TABLE codes ADD COLUMN IF NOT EXISTS transferred_from_email VARCHAR(255);
-- ... (see transfer-schema.sql for complete schema)
"
```

### Step 2: Add Transfer API Routes
```javascript
// In server/server.js or your main app file:
const transferAPI = require('./routes/transfer-api');
app.use('/api/assets', transferAPI);
```

### Step 3: Update SafeCode HTML
```html
<!-- In codebank/safecode/index.html -->
<!-- Replace sf-interior section with enhanced version -->
<!-- Add CSS styles from safecode-enhanced.html -->
<!-- Add JavaScript functions from safecode-enhanced.html -->
```

### Step 4: Deploy to GitLab

```bash
# Clone or pull the latest code
git clone https://gitlab.com/dia201244/drd2027.git
cd drd2027

# Create a new branch for this feature
git checkout -b feature/asset-transfer-tracking

# Add the new files
cp transfer-schema.sql database/
cp transfer-api.js server/routes/
# Update codebank/safecode/index.html

# Commit changes
git add -A
git commit -m "feat: Add asset transfer tracking with visual indicators

- Add source_type tracking (self, user_transfer, admin_transfer)
- Create transfer API endpoints for user and admin transfers
- Enhance SafeCode UI with color-coded asset display
- Add transfer history modal and statistics
- Track transfer metadata (who, when, message)"

# Push to GitLab
git push origin feature/asset-transfer-tracking

# Create a Merge Request (via GitLab UI)
```

## 🎨 Color Scheme Reference

### Asset Display Colors
```css
/* Self-generated (default cyan) */
--self: #00d4ff;          /* Cyan glow */

/* User transfer (orange) */
--user-transfer: #ff9930;  /* Orange */

/* Admin transfer (red) */
--admin-transfer: #ff4444; /* Red */
```

### Implementation in SafeCode
- Each asset row shows a badge with the source type
- Asset value color changes based on source
- Transfer metadata visible on hover
- Statistics panel shows count by source

## 📊 API Examples

### Transfer Asset Between Users
```javascript
// User A transfers code to User B
fetch('/api/assets/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    asset_id: 'code-12345',
    asset_type: 'code',
    to_email: 'user-b@example.com',
    message: 'Security improvement technique'
  })
});
```

### Admin Sends Asset
```javascript
// Admin sends gold asset to user
fetch('/api/assets/admin-send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    asset_id: 'gold-001',
    asset_type: 'gold',
    to_email: 'user@example.com',
    message: 'Monthly reward'
  })
});
```

### Fetch Assets with Source Info
```javascript
// Get all assets with source information
fetch('/api/assets/sync')
  .then(r => r.json())
  .then(assets => {
    console.log(assets);
    // {
    //   codes: [
    //     { id, content, source_type: 'self', ... },
    //     { id, content, source_type: 'user_transfer', transferred_from_email: '...', ... },
    //   ],
    //   silver: [...],
    //   gold: [...]
    // }
  });
```

### Get Transfer History
```javascript
// Fetch transfer history
fetch('/api/assets/history?filter=received&limit=50')
  .then(r => r.json())
  .then(data => {
    console.log(data.transfers); // Array of transfer records
  });
```

## 🔐 Security Considerations

1. **Authentication Required**
   - All transfer endpoints require authenticated user
   - Admin endpoints check for `role === 'admin'`

2. **Ownership Verification**
   - Transfer endpoint verifies asset ownership
   - Only asset owner can transfer

3. **Audit Trail**
   - All transfers logged with IP address
   - Complete history available in `asset_transfers` table
   - Timestamped records for compliance

4. **Rate Limiting** (Recommended)
   ```javascript
   const rateLimit = require('express-rate-limit');
   const transferLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 50 // 50 transfers per window
   });
   app.use('/api/assets/transfer', transferLimiter);
   ```

## 🧪 Testing

### Manual Testing
1. Open SafeCode vault in browser
2. Verify assets display with correct source colors
3. Click "View Transfer History" button
4. Confirm transfer stats are accurate

### API Testing
```bash
# Test transfer endpoint
curl -X POST http://localhost:3000/api/assets/transfer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": "test-code",
    "asset_type": "code",
    "to_email": "recipient@example.com",
    "message": "Test transfer"
  }'

# Test sync endpoint
curl -X GET http://localhost:3000/api/assets/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 Performance Considerations

1. **Database Indices**
   - Already created in schema for fast queries
   - `idx_transfers_to_email` for recipient queries
   - `idx_codes_source`, `idx_silver_source`, `idx_gold_source`

2. **Query Optimization**
   - Use `source_type` index when filtering
   - Limit history results with pagination

3. **Caching** (Optional)
   - Cache asset list for 5-10 seconds
   - Invalidate on transfer
   - Reduces database load

## 🚀 Deployment Checklist

- [ ] Database schema applied
- [ ] Transfer API routes added to Express app
- [ ] SafeCode UI updated with enhanced HTML
- [ ] Authentication middleware configured
- [ ] Admin role detection implemented
- [ ] Error handling tested
- [ ] API endpoints verified working
- [ ] Transfer history modal tested
- [ ] Color display verified in browser
- [ ] Code committed to feature branch
- [ ] Merge request created
- [ ] Code review completed
- [ ] Deployed to staging environment
- [ ] Deployed to production

## 📝 Database Backup

Before deploying, backup your database:
```bash
pg_dump -U your_user -d your_database > backup-$(date +%Y%m%d).sql
```

## 🆘 Troubleshooting

### Assets Not Showing Colors
- Check that `source_type` column exists in database
- Verify CSS styles are loaded
- Check browser console for JavaScript errors

### Transfer Endpoint Returns 500
- Verify `db` module is properly exported
- Check that authentication middleware sets `req.user`
- Verify table names match your database schema

### Transfer History Not Loading
- Ensure `asset_transfers` table exists
- Check that transfers are being recorded
- Verify query parameters are correct

## 📞 Support

For questions or issues:
1. Check the API documentation above
2. Review the code comments in each file
3. Test individual API endpoints
4. Check browser console for errors
5. Review database logs for SQL errors

## 📚 Additional Resources

- SafeCode Original: `codebank/safecode/index.html`
- Express.js Routing: https://expressjs.com/en/guide/routing.html
- PostgreSQL Docs: https://www.postgresql.org/docs/
- REST API Best Practices: https://restfulapi.net/

---

**Version:** 1.0  
**Last Updated:** 2026-04-11  
**Status:** Ready for Deployment
