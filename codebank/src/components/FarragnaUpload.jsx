import React, { useState } from 'react'

export default function FarragnaUpload() {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)

  async function requestUploadUrl() {
    const res = await fetch('/api/farragna/upload/request', { method: 'POST', credentials: 'include' })
    if (!res.ok) throw new Error('Upload request failed')
    return res.json()
  }

  async function onFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setStatus('Requesting upload URL...')
    try {
      const { upload_url } = await requestUploadUrl()
      setStatus('Uploading to Cloudflare...')
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', upload_url)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) setProgress(Math.round((evt.loaded / evt.total) * 100))
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Upload failed'))
        xhr.onerror = () => reject(new Error('Upload error'))
        xhr.send(file)
      })
      setStatus('Processing...')
    } catch (err) {
      setStatus('Error: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input type="file" accept="video/*" onChange={onFileSelected} disabled={uploading} />
      {status && <div>{status} {progress ? `${progress}%` : ''}</div>}
    </div>
  )
}

