# Presage Engine API Documentation

## Overview

The Presage Engine is a Dockerized C++ microservice that extracts vital signs (heart rate, breathing rate) from video files using the Presage SmartSpectra SDK.

## Endpoints

### POST /process-video

**Primary endpoint for video processing and vitals extraction.**

Uploads a video file, processes it with Presage SDK, and returns comprehensive vitals data as JSON.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field name: `video`
- File format: MP4, AVI, or MOV

**Example:**
```bash
curl -X POST http://localhost:8080/process-video \
  -F "video=@patient_video.mp4"
```

**Response:**
```json
{
  "success": true,
  "video_file": "video_1234567890.mp4",
  "vitals": {
    "heart_rate": {
      "avg": 72.5,
      "min": 65.0,
      "max": 85.0,
      "count": 150
    },
    "breathing_rate": {
      "avg": 15.2,
      "min": 12.0,
      "max": 18.0,
      "count": 150
    },
    "readings_count": 150,
    "all_readings": [
      {
        "timestamp_ms": 0,
        "heart_rate_bpm": 70.0,
        "breathing_rate_bpm": 14.0
      },
      {
        "timestamp_ms": 100,
        "heart_rate_bpm": 72.0,
        "breathing_rate_bpm": 15.0
      }
      // ... more readings
    ]
  },
  "processing_complete": true
}
```

**Response Fields:**
- `success`: Boolean indicating if processing succeeded
- `video_file`: Name of the uploaded video file
- `vitals`: Object containing vitals analysis
  - `heart_rate`: Statistics object with `avg`, `min`, `max`, `count`
  - `breathing_rate`: Statistics object with `avg`, `min`, `max`, `count`
  - `readings_count`: Total number of readings collected
  - `all_readings`: Array of all individual readings with timestamps
- `processing_complete`: Boolean indicating processing finished

**Error Responses:**
- `400`: No video file provided
- `409`: Processing already in progress
- `500`: Failed to save file or processing error

---

### GET /status

Check the status of the Presage Engine and SDK.

**Response:**
```json
{
  "status": "SDK Ready",
  "sdk_initialized": true,
  "camera_running": false,
  "camera_available": false,
  "video_file_uploaded": false,
  "video_file_path": ""
}
```

---

### GET /live

Get the latest vitals reading (from most recent processing).

**Response:**
```json
{
  "timestamp_ms": 1234567890,
  "heart_rate_bpm": 72.5,
  "breathing_rate_bpm": 15.2
}
```

Or if no data available:
```json
{
  "message": "No vitals data available yet",
  "suggestion": "Call /test first to collect data"
}
```

---

### GET /test

Run video processing using previously uploaded video or camera (if available).

**Note:** This is a legacy endpoint. Use `/process-video` for new implementations.

---

### POST /upload

Upload a video file without processing (legacy endpoint).

**Note:** Use `/process-video` instead, which uploads and processes in one step.

---

### GET /health

Simple health check endpoint.

**Response:** `OK`

---

## Usage Flow

### Complete Workflow

1. **Upload and Process Video:**
   ```bash
   curl -X POST http://presage-engine:8080/process-video \
     -F "video=@patient_video.mp4"
   ```

2. **Receive Vitals JSON:**
   ```json
   {
     "success": true,
     "vitals": {
       "heart_rate": {"avg": 72.5, "min": 65, "max": 85},
       "breathing_rate": {"avg": 15.2, "min": 12, "max": 18}
     }
   }
   ```

3. **Send to Gemini Service:**
   ```bash
   curl -X POST http://gemini-service:3000/analyze-video \
     -F "video=@patient_video.mp4" \
     -F "presageData={\"heart_rate\":{\"avg\":72.5},...}"
   ```

## Video Requirements

- **Formats:** MP4, AVI, MOV
- **Frame Rate:** >10 FPS recommended
- **Quality:** Well-lit, minimal movement for best accuracy
- **Subject:** Single person, facing camera

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (missing file, invalid format)
- `409`: Conflict (processing already in progress)
- `500`: Internal server error

Error responses include a JSON object with an `error` field describing the issue.
