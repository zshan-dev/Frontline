# Video Analysis Endpoint

## Endpoint URL
```
POST http://localhost:3000/analyze-video
```

## Frontend Integration

When the frontend records a 10-second video, it should:

1. **Record the video** using MediaRecorder API (creates a Blob)
2. **Send POST request** to the backend endpoint with:
   - `video`: The video Blob/File (MP4 or WebM format)
   - `presageData`: (optional) Stringified JSON with vitals/sensor data

## Example Frontend Code (Reference)

```javascript
// After recording 10-second video
const videoBlob = mediaRecorder.getBlob(); // or however you get the video

const formData = new FormData();
formData.append('video', videoBlob, 'recording.webm');
formData.append('presageData', JSON.stringify({
  heartRate: 75,
  breathingRate: 16,
  focus: 85
}));

const response = await fetch('http://localhost:3000/analyze-video', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.analysis contains injury analysis
// result.presage contains your presageData
```

## Where Video is Saved

The video is temporarily saved to:
```
backend/gemini-service/tmp/video-{timestamp}.{ext}
```

Frames are extracted to:
```
backend/gemini-service/tmp/frames/frame-{timestamp}s.jpg
```

**All files are automatically deleted after processing completes.**
