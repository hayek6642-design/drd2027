# Voice Messages Implementation

This document describes the voice messages (voice notes) feature implementation for E7ki! chat application.

## Overview

Voice messages allow users to record and send audio messages directly in chat. The implementation uses the browser's MediaRecorder API for recording and Supabase Storage for file hosting.

## Features

- **Recording**: Press-and-hold or tap-to-start recording with visual feedback
- **Waveform Visualization**: Real-time audio waveform during recording
- **Preview**: Play back recording before sending
- **Upload Progress**: Visual progress indicator during upload
- **Playback**: Compact audio player with seek functionality
- **Fallback**: File upload for browsers without MediaRecorder support
- **File Limits**: 20MB maximum file size
- **Formats**: WebM/OGG with Opus codec (preferred), fallback to browser default

## Database Schema

### New Table: `e7ki_voice_messages`

```sql
CREATE TABLE public.e7ki_voice_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.e7ki_messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id)
);
```

### Updated `message_type` Enum

Added `'voice'` to the existing `message_type` enum.

## File Structure

### Frontend Changes

- `frontend/index.html`: Added voice recording UI elements
- `frontend/styles.css`: Added voice recording and playback styles
- `frontend/chat.js`: Added voice recording logic and message rendering

### Database Changes

- `supabase/migrations/20240101000003_voice_messages.sql`: Schema migration

## API Usage

### Recording Flow

1. User clicks voice button → `toggleVoiceRecording()`
2. Check MediaRecorder support → fallback to file upload if unsupported
3. Request microphone permission → `navigator.mediaDevices.getUserMedia()`
4. Start recording → `MediaRecorder.start()`
5. Display waveform → Web Audio API analysis
6. Stop recording → `MediaRecorder.stop()`
7. Show preview controls → play/re-record/send options
8. Upload to Supabase → `storage.from('chat_media').upload()`
9. Insert message → `db.messages().insert()`
10. Insert metadata → `db.from('e7ki_voice_messages').insert()`

### Playback Flow

1. Click play button → `playVoiceMessage()`
2. Load audio → `<audio>` element
3. Update progress bar → CSS width animation
4. Handle play/pause → audio controls

## Security & Permissions

- **RLS Policies**: Voice messages inherit chat membership restrictions
- **Storage Policies**: Only chat members can upload/view voice files
- **File Validation**: MIME type and size validation
- **User Permissions**: Microphone access required for recording

## Browser Support

### Supported Browsers
- Chrome 47+
- Firefox 25+
- Safari 14.1+
- Edge 79+

### Fallback Behavior
- Browsers without MediaRecorder → File upload input
- No microphone permission → Error message
- Audio playback issues → Download link fallback

## Testing Instructions

### Manual Testing

1. **Open Test Page**
   ```bash
   # Serve the test file
   cd services/codebank/e7ki
   python3 -m http.server 8000
   # Open http://localhost:8000/test-voice.html
   ```

2. **Browser Support Check**
   - Verify all required APIs are supported
   - Note any fallback behaviors

3. **Recording Test**
   - Click voice button (🎤)
   - Grant microphone permission
   - Verify waveform animation
   - Check timer updates
   - Stop recording
   - Test preview playback
   - Test re-record functionality

4. **File Upload Fallback**
   - Disable MediaRecorder in browser dev tools
   - Click voice button
   - Verify file input appears
   - Test file selection and upload

5. **Playback Test**
   - Use sample voice message
   - Test play/pause functionality
   - Verify progress bar updates
   - Test multiple voice messages (only one plays at a time)

### Integration Testing

1. **Full Chat Flow**
   - Open main chat application
   - Navigate to a chat
   - Record and send voice message
   - Verify message appears for other users (if realtime enabled)
   - Test voice message playback

2. **File Size Limits**
   - Attempt to upload file > 20MB
   - Verify error message

3. **Network Issues**
   - Simulate slow network during upload
   - Test upload retry logic
   - Verify progress indicators

### QA Checklist

- [ ] Voice button appears in message input
- [ ] Recording UI displays correctly
- [ ] Waveform visualizes audio input
- [ ] Timer updates during recording
- [ ] Preview playback works
- [ ] Re-record functionality works
- [ ] Upload progress shows
- [ ] Voice message appears in chat
- [ ] Playback controls work
- [ ] Only one voice message plays at a time
- [ ] File size limits enforced
- [ ] Fallback to file upload works
- [ ] Error handling for permission denied
- [ ] Error handling for upload failures
- [ ] Mobile responsive design
- [ ] Cross-browser compatibility

## Performance Considerations

- **Compression**: WebM/OGG formats provide good compression
- **File Size**: 20MB limit prevents abuse
- **Lazy Loading**: Audio elements use `preload="none"`
- **Memory Management**: Proper cleanup of audio contexts and URLs
- **Concurrent Playback**: Only one voice message plays at a time

## Future Enhancements

- **Voice Effects**: Filters, pitch adjustment
- **Transcription**: Speech-to-text integration
- **Compression**: Client-side audio compression
- **Streaming**: Real-time voice streaming
- **Voice Notes**: Saved voice notes feature

## Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   - Check browser permissions
   - Ensure HTTPS (required for getUserMedia)
   - Try refreshing page

2. **Recording Not Working**
   - Check browser compatibility
   - Verify MediaRecorder support
   - Check console for errors

3. **Upload Failing**
   - Check Supabase configuration
   - Verify storage bucket exists
   - Check network connectivity
   - Verify user authentication

4. **Playback Issues**
   - Check audio file format support
   - Verify file URLs are accessible
   - Check for CORS issues

### Debug Commands

```javascript
// Check MediaRecorder support
console.log('MediaRecorder:', typeof MediaRecorder);
console.log('getUserMedia:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

// Test audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
console.log('AudioContext:', audioContext);
```

## Deployment Notes

1. **Supabase Setup**
   - Run migration: `supabase db push`
   - Verify storage bucket 'chat_media' exists
   - Check RLS policies are applied

2. **Environment Variables**
   - Ensure Supabase URL and keys are configured
   - Verify storage bucket permissions

3. **CDN Considerations**
   - Audio files served from Supabase Storage
   - Consider CDN for better performance

## Support

For issues or questions about voice messages implementation, check:
1. Browser console for errors
2. Network tab for failed requests
3. Supabase dashboard for storage issues
4. Database logs for RLS policy violations