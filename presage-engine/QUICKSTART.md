# Quick Start Guide

## Step 1: Get the Presage SDK

1. Visit https://physiology.presagetech.com
2. Log in with your account (you have API key: `Wi653BfvtR5Dwdz232Lnn7RTfJFYScuT6VndgGib`)
3. Download the Linux SDK package (`.deb` file)
4. Place it in `libs/presage-sdk.deb`

```bash
# Example:
cp ~/Downloads/presage-sdk.deb presage-engine/libs/
```

## Step 2: Set API Key

```bash
export PRESAGE_API_KEY="Wi653BfvtR5Dwdz232Lnn7RTfJFYScuT6VndgGib"
```

Or create a `.env` file:
```bash
echo "PRESAGE_API_KEY=Wi653BfvtR5Dwdz232Lnn7RTfJFYScuT6VndgGib" > .env
```

## Step 3: Build and Run

```bash
cd presage-engine
docker-compose up --build
```

## Step 4: Test

In another terminal:

```bash
# Check status
curl http://localhost:8080/status

# Run 10-second test (watch Docker logs for output)
curl http://localhost:8080/test

# Get latest vitals
curl http://localhost:8080/live
```

## What to Expect

- **Build**: Docker will download dependencies, install SDK, and compile
- **Runtime**: Server starts on port 8080
- **/test endpoint**: Runs camera for 10 seconds, prints vitals to console
- **/live endpoint**: Returns JSON with latest heart rate and breathing rate

## Troubleshooting

### Build fails: "presage-sdk.deb not found"
- Make sure you downloaded the SDK and placed it in `libs/` directory
- Check: `ls -la libs/presage-sdk.deb`

### Build fails: "Could not find SmartSpectra"
- The SDK .deb file might not have installed correctly
- Check Docker build logs for dpkg errors
- You may need to install dependencies manually

### Runtime: "Camera device /dev/video0 not found"
- On macOS: Docker cannot access webcam directly
- Options:
  1. Use Linux VM with USB passthrough
  2. Use network camera stream
  3. Modify code to use video file input

### API returns errors
- Check Docker logs: `docker-compose logs -f`
- Verify API key is set: `docker-compose exec presage_core env | grep API_KEY`
- Check camera access: `docker-compose exec presage_core ls -la /dev/video0`
