import React, { useEffect } from 'react'

export default function FarragnaPlayer({ video }) {
  useEffect(() => {
    let played = false
    function onPlay() {
      if (played) return
      played = true
      fetch(`/api/farragna/${video.id}`, { credentials: 'include' }).catch(() => {})
    }
    const el = document.getElementById(`farragna-video-${video.id}`)
    if (el) el.addEventListener('play', onPlay)
    return () => { if (el) el.removeEventListener('play', onPlay) }
  }, [video.id])

  if (!video.playback_url || video.status !== 'ready') return <div>Not ready</div>
  return (
    <video id={`farragna-video-${video.id}`} controls src={video.playback_url} />
  )
}

