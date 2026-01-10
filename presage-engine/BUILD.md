# Building the Presage Engine

## Quick Build

```bash
cd presage-engine
docker-compose build
```

## SDK Installation

The Presage SDK is **automatically installed** from the official repository during the Docker build process. No manual steps required!

## Build Process

The Dockerfile will:
1. ✅ Install system dependencies (OpenCV, build tools, etc.)
2. ✅ Add Presage official repository
3. ✅ Install `libsmartspectra-dev` via apt
4. ✅ Download HTTP and JSON libraries
5. ✅ Build the C++ application

The SDK installation happens automatically - no need to download or place any files.

## Troubleshooting

### Build fails at SDK installation step
- Check internet connection (repository needs to be accessed)
- Verify Presage repository is accessible: `curl https://presage-security.github.io/PPA/`
- Check Docker build logs for specific error messages

### "Could not find SmartSpectra" during CMake
- SDK installation may have failed
- Check Docker build logs for apt installation errors
- Verify repository was added correctly: `docker exec presage_engine cat /etc/apt/sources.list.d/presage-technologies.list`

### Build fails at CMake step
- SDK might not be installed correctly
- Check Docker build logs for CMake errors
- Verify SDK is installed: `docker exec presage_engine dpkg -l | grep smartspectra`

## Next Steps After Build

1. **Start the service:**
   ```bash
   docker-compose up
   ```

2. **Test the API:**
   ```bash
   curl http://localhost:8080/health
   ```

3. **Process a video:**
   ```bash
   curl -X POST http://localhost:8080/process-video \
     -F "video=@test_video.mp4"
   ```
