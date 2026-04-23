import { Router } from 'express'
import cloudinary from 'cloudinary'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { query } from '../config/db.js'

const router = Router()

// Configure multer
const upload = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB per file
    files: 2000, // Maximum 2000 files
    fieldSize: 200 * 1024 * 1024,
    fields: 10
  },
  fileFilter: (req, file, cb) => {
    cb(null, true) // Allow any file type
  }
})

// Ensure Cloudinary is configured from environment variables
try {
  const cfg = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  }
  if (cfg.cloud_name && cfg.api_key && cfg.api_secret) {
    cloudinary.v2.config(cfg)
  }
} catch (_) {}

// Helper functions
function extractMetadataFromFilename(filename) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  let title = nameWithoutExt
  let artist = 'Unknown Artist'
  let album = null
  const separators = [' - ', '_-_', '__', ' – ']
  for (const separator of separators) {
    if (nameWithoutExt.includes(separator)) {
      const parts = nameWithoutExt.split(separator)
      if (parts.length >= 2) {
        artist = parts[0].trim()
        title = parts.slice(1).join(separator).trim()
        break
      }
    }
  }
  title = title.replace(/^(official|music|video|audio|song)\s+/i, '')
  title = title.replace(/\s+(official|music|video|audio|song)$/i, '')
  return { title: title || nameWithoutExt, artist, album }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
}

router.get('/songs', async (req, res) => {
  try {
    const prefixes = ['media-player/', 'samma3ny/', 'media-player', 'samma3ny']
    const all = []
    for (const prefix of prefixes) {
      let next = null
      let page = 0
      do {
        page++
        const opts = {
          resource_type: 'video',
          type: 'upload',
          max_results: 500,
          ...(prefix ? { prefix } : {})
        }
        if (next) opts.next_cursor = next
        const r = await cloudinary.v2.api.resources(opts)
        const resources = Array.isArray(r.resources) ? r.resources : []
        for (const item of resources) {
          all.push({
            id: item.public_id,
            url: item.secure_url,
            duration: item.duration,
            bytes: item.bytes,
            created_at: item.created_at,
            name: (item.context && item.context.custom && (item.context.custom.title || item.context.custom.display_name)) || null
          })
        }
        next = r.next_cursor || null
      } while (next)
      if (all.length > 0) break
    }
    if (all.length === 0) {
      const s = await cloudinary.v2.search
        .expression('resource_type:video')
        .sort_by('created_at', 'desc')
        .max_results(100)
        .execute()
      const tracks = (s.resources || []).map(item => ({
        id: item.public_id,
        url: item.secure_url,
        duration: item.duration,
        bytes: item.bytes,
        created_at: item.created_at
      }))
      if (tracks.length > 0) return res.json(tracks)
      try {
        const jsonPath = path.join(process.cwd(), 'services', 'codebank', 'samma3ny', 'songs.json')
        const raw = fs.readFileSync(jsonPath, 'utf-8')
        const arr = JSON.parse(raw)
        const local = arr.map(item => ({
          id: item.public_id,
          url: item.secure_url || item.url,
          duration: item.duration || 0,
          bytes: item.bytes || 0,
          created_at: item.created_at
        }))
        return res.json(local)
      } catch (_) {
        return res.json([])
      }
    }
    try {
      const rows = await query('SELECT id, name, position FROM samma3ny_songs', [])
      const byId = new Map(rows.rows.map(r => [r.id, r]))
      for (const s of all) {
        const r = byId.get(s.id)
        if (r) {
          if (r.name) s.name = r.name
          if (typeof r.position === 'number') s.position = r.position
        }
      }
      all.sort((a, b) => {
        const ap = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER
        const bp = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER
        if (ap !== bp) return ap - bp
        return (a.created_at || '').localeCompare(b.created_at || '')
      })
    } catch (_) {}
    res.json(all)
  } catch (e) {
    res.status(500).json({ message: 'Cloudinary fetch failed', error: e.message })
  }
})

// List with direct Cloudinary fetch
router.get('/list', async (req, res) => {
  try {
    console.log('🔄 Fetching Samma3ny songs with direct Cloudinary API call...')
    const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'dhpyneqgk'
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '799518422494748'
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'zfSbK0-zK3tHdmCWdcCduPcxtU4'
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/resources/video?prefix=samma3ny/&type=upload&max_results=500`
    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64")
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` }
    })
    if (!response.ok) throw new Error(`Cloudinary API error: ${response.status} ${response.statusText}`)
    const data = await response.json()
    const files = data.resources || []
    console.log(`✅ Direct fetch: Found ${files.length} resources in samma3ny/ folder`)
    res.json({ ok: true, files })
  } catch (error) {
    console.error('❌ Direct Cloudinary fetch error:', error.message)
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Bulk upload
router.post('/upload', upload.any(), async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded', message: 'Please select audio files to upload' })
    }
    console.log(`📤 Starting bulk upload for ${files.length} Samma3ny files`)
    const uploadResults = []
    const errors = []
    let successCount = 0
    let failCount = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileIndex = i + 1
      try {
        console.log(`📤 Processing file ${fileIndex}/${files.length}: ${file.originalname}`)
        if (!file.mimetype.startsWith('audio/')) {
          errors.push({ file: file.originalname, error: 'Invalid file type', message: 'Only audio files are allowed' })
          failCount++
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
          continue
        }
        const maxSize = 100 * 1024 * 1024
        if (file.size > maxSize) {
          errors.push({ file: file.originalname, error: 'File too large', message: `Maximum file size is ${Math.round(maxSize / (1024 * 1024))}MB` })
          failCount++
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
          continue
        }
        const metadata = extractMetadataFromFilename(file.originalname)
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substr(2, 9)
        const publicId = `media-player/audio_${timestamp}_${randomId}`
        try {
          const result = await cloudinary.v2.uploader.upload(file.path, {
            resource_type: 'video',
            folder: 'media-player',
            public_id: publicId,
            format: 'mp3',
            quality: 'auto',
            context: {
              title: metadata.title,
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Samma3ny Collection',
              uploaded_by: 'admin',
              upload_date: new Date().toISOString()
            }
          })
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
          const uploadResult = {
            success: true,
            file: file.originalname,
            url: result.secure_url,
            public_id: result.public_id,
            duration: result.duration || 0,
            format: result.format,
            bytes: result.bytes,
            size: formatFileSize(result.bytes),
            metadata: { title: metadata.title, artist: metadata.artist || 'Unknown Artist', album: metadata.album || 'Samma3ny Collection' },
            uploaded_at: new Date().toISOString()
          }
          uploadResults.push(uploadResult)
          successCount++
          console.log(`✅ Successfully uploaded: ${file.originalname} (${formatFileSize(result.bytes)})`)
        } catch (uploadError) {
          console.error(`❌ Cloudinary upload failed for ${file.originalname}:`, uploadError.message)
          try {
            const localPath = path.join(process.cwd(), 'services/codebank/samma3ny/uploads')
            if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true })
            const localFileName = `local_${timestamp}_${file.originalname}`
            const localFilePath = path.join(localPath, localFileName)
            fs.moveSync(file.path, localFilePath)
            const uploadResult = {
              success: true,
              file: file.originalname,
              url: `/services/codebank/samma3ny/uploads/${localFileName}`,
              public_id: `local_${timestamp}`,
              duration: 0,
              format: 'mp3',
              bytes: file.size,
              size: formatFileSize(file.size),
              offline_mode: true,
              metadata: { title: metadata.title, artist: metadata.artist || 'Unknown Artist', album: metadata.album || 'Samma3ny Collection' },
              message: 'Uploaded locally - Cloudinary temporarily unavailable',
              uploaded_at: new Date().toISOString()
            }
            uploadResults.push(uploadResult)
            successCount++
            console.log(`⚠️ Uploaded locally: ${file.originalname}`)
          } catch (localError) {
            console.error(`❌ Local storage failed for ${file.originalname}:`, localError.message)
            errors.push({ file: file.originalname, error: 'Upload failed', message: 'Both Cloudinary and local storage failed' })
            failCount++
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
          }
        }
      } catch (fileError) {
        console.error(`❌ Error processing ${file.originalname}:`, fileError.message)
        errors.push({ file: file.originalname, error: 'Processing failed', message: fileError.message })
        failCount++
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
      }
    }
    const response = {
      total_files: files.length,
      successful_uploads: successCount,
      failed_uploads: failCount,
      results: uploadResults,
      errors: errors,
      summary: `${successCount} files uploaded successfully, ${failCount} failed`
    }
    console.log(`📊 Bulk upload completed: ${successCount}/${files.length} files successful`)
    if (successCount > 0) console.log('🎵 New songs are now available in the playlist')
    res.json(response)
  } catch (error) {
    console.error('❌ Bulk upload error:', error)
    res.status(500).json({
      error: 'Bulk upload service error',
      message: error.message,
      total_files: 0,
      successful_uploads: 0,
      failed_uploads: 0,
      results: [],
      errors: [{ error: 'Server error', message: error.message }]
    })
  }
})

router.post('/order', async (req, res) => {
  try {
    const positions = Array.isArray(req.body?.positions) ? req.body.positions : []
    if (positions.length === 0) return res.json({ ok: true, updated: 0 })
    let updated = 0
    try {
      for (const { id, position } of positions) {
        await query(
          'INSERT INTO samma3ny_songs (id, position, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET position = EXCLUDED.position, updated_at = CURRENT_TIMESTAMP',
          [id, typeof position === 'number' ? position : null]
        )
        updated++
      }
      return res.json({ ok: true, updated })
    } catch (_) {}
    for (const { id, position } of positions) {
      try {
        await cloudinary.v2.api.update(id, { context: { order: position } })
        updated++
      } catch (_) {}
    }
    res.json({ ok: true, updated })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

router.post('/rename', async (req, res) => {
  try {
    const id = req.body?.id
    const name = (req.body?.name || '').trim()
    if (!id || !name) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' })
    try {
      await query(
        'INSERT INTO samma3ny_songs (id, name, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP',
        [id, name]
      )
      return res.json({ ok: true })
    } catch (_) {}
    try {
      await cloudinary.v2.api.update(id, { context: { title: name, display_name: name } })
      return res.json({ ok: true })
    } catch (e2) {
      return res.status(500).json({ ok: false, error: e2.message })
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

router.post('/rename-bulk', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
    const name = (req.body?.name || '').trim()
    if (ids.length === 0 || !name) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' })
    let updated = 0
    try {
      for (const id of ids) {
        await query(
          'INSERT INTO samma3ny_songs (id, name, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP',
          [id, name]
        )
        updated++
      }
      return res.json({ ok: true, updated })
    } catch (_) {}
    for (const id of ids) {
      try {
        await cloudinary.v2.api.update(id, { context: { title: name, display_name: name } })
        updated++
      } catch (_) {}
    }
    res.json({ ok: true, updated })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Upload status
router.get('/upload-status', (req, res) => {
  res.json({
    status: 'idle',
    last_upload: null,
    total_songs: 492,
    message: 'Upload system ready'
  })
})

// Refresh playlist
router.post('/refresh-playlist', async (req, res) => {
  try {
    console.log('🔄 Manual playlist refresh requested')
    const response = await cloudinary.v2.api.resources({
      resource_type: 'video',
      prefix: 'media-player/',
      type: 'upload',
      max_results: 500
    })
    const audioFiles = response.resources.filter(resource =>
      resource.format && ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(resource.format.toLowerCase())
    )
    console.log(`✅ Playlist refreshed: ${audioFiles.length} songs available`)
    res.json({
      success: true,
      message: `Playlist refreshed with ${audioFiles.length} songs`,
      total_songs: audioFiles.length,
      refreshed_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Playlist refresh error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to refresh playlist',
      message: error.message
    })
  }
})

// Songs count
router.get('/songs/count', async (req, res) => {
  try {
    const response = await cloudinary.v2.api.resources({
      resource_type: 'video',
      prefix: 'media-player/',
      type: 'upload',
      max_results: 500
    })
    const audioFiles = response.resources.filter(resource =>
      resource.format && ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(resource.format.toLowerCase())
    )
    res.json({ count: audioFiles.length, folder: 'media-player' })
  } catch (error) {
    console.error('Error getting track count:', error)
    res.status(500).json({ error: 'Failed to get track count' })
  }
})

export default router
