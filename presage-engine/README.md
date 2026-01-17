# Presage Engine - Docker & SDK Setup Guide

A comprehensive guide to understanding the Docker containerization and Presage SmartSpectra SDK integration for the Presage Engine microservice.

## Table of Contents

1. [Why Docker?](#why-docker)
2. [Architecture Overview](#architecture-overview)
3. [Presage SmartSpectra SDK](#presage-smartspectra-sdk)
4. [Docker Setup](#docker-setup)
5. [SDK Installation Process](#sdk-installation-process)
6. [Build System](#build-system)
7. [Running the Server](#running-the-server)
8. [Troubleshooting](#troubleshooting)

---

## Why Docker?

### The Problem

The **Presage SmartSpectra SDK** is a **Linux-only C++ library** that:
- Only works on **Ubuntu 22.04** (or Linux Mint 21)
- Requires specific system dependencies and libraries
- Is not available for macOS or Windows natively
- Needs a consistent, reproducible environment

### The Solution: Docker Containerization

Docker allows us to:
1. **Run Linux on any OS** - Create an Ubuntu 22.04 container that works on macOS, Windows, or Linux
2. **Isolate dependencies** - Keep all SDK requirements contained in one environment
3. **Reproducible builds** - Same environment every time, regardless of host OS
4. **Platform emulation** - Run `amd64` (x86_64) packages on ARM64 (Apple Silicon) via QEMU

### Architecture Compatibility

**The Challenge:**
- Presage SDK packages are only available for `amd64` (x86_64) architecture
- Modern Macs (Apple Silicon) use `aarch64` (ARM64) architecture
- These are incompatible without emulation

**The Solution:**
- Docker's `--platform linux/amd64` flag enables QEMU emulation
- Allows `amd64` containers to run on `aarch64` hosts
- Container runs x86_64 Linux, host runs ARM64 macOS - Docker handles translation

---

## Architecture Overview

### Container Architecture

```
┌─────────────────────────────────────────────────┐
│  Host Machine (macOS/Windows/Linux)             │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Docker Container (Ubuntu 22.04 amd64)    │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  Presage SmartSpectra SDK           │  │  │
│  │  │  - libsmartspectra-dev              │  │  │
│  │  │  - libphysiologyedge-dev            │  │  │
│  │  │  - OpenCV 4.10.0 (Presage version)  │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  Presage Engine Server             │  │  │
│  │  │  - C++ HTTP server (httplib)       │  │  │
│  │  │  - Port 8080                       │  │  │
│  │  └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
│           ↕ Port 8080 (mapped)                  │
└─────────────────────────────────────────────────┘
```

### File Structure

```
presage-engine/
├── Dockerfile              # Container definition
├── docker-compose.yml      # Container orchestration
├── CMakeLists.txt          # C++ build configuration
├── main.cpp                # HTTP server application
├── hello_vitals.cpp        # Test program
├── start-server.sh         # Startup script
├── .env                    # API key configuration
└── deps/                   # Header-only dependencies
    ├── httplib.h           # HTTP server library
    └── json.hpp            # JSON library
```

---

## Presage SmartSpectra SDK

### What is the Presage SDK?

The **Presage SmartSpectra SDK** is a C++ library that uses **remote photoplethysmography (rPPG)** to extract vital signs from video:

- **Heart Rate (BPM)** - Pulse rate detection
- **Breathing Rate (BPM)** - Respiratory rate detection
- **Consciousness/Focus** - Attention and alertness metrics

### SDK Requirements

**Operating System:**
- Ubuntu 22.04 (Jammy) - **Required**
- Linux Mint 21 - Supported
- **NOT available for macOS or Windows**

**Architecture:**
- `amd64` (x86_64) - **Primary support**
- `aarch64` (ARM64) - Limited/experimental

**Dependencies:**
- CMake 3.27.0 or higher
- OpenCV 4.10.0 (Presage provides custom version)
- OpenGL/GLES3 libraries
- V4L (Video4Linux) libraries
- CURL and OpenSSL development libraries

### SDK Installation Source

The SDK is installed from **Presage's official PPA (Personal Package Archive)**:

```bash
# Repository URL
https://presage-security.github.io/PPA/

# Packages installed
- libphysiologyedge-dev (dependency)
- libsmartspectra-dev (main SDK)
```

**Note:** The SDK requires a valid API key from Presage Technologies to function.

---

## Docker Setup

### Dockerfile Breakdown

The `Dockerfile` creates a complete Ubuntu 22.04 environment with all required dependencies:

```dockerfile
# Base image: Ubuntu 22.04
FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    curl \
    wget \
    gpg \
    # ... other dependencies

# Install CMake 3.27.0+ (required by SDK)
# Ubuntu 22.04 comes with 3.22.1, so we install from Kitware repository

# Install Presage SDK from official PPA
RUN curl -s "https://presage-security.github.io/PPA/KEY.gpg" | gpg --dearmor | \
    tee /etc/apt/trusted.gpg.d/presage-technologies.gpg >/dev/null && \
    curl -s --compressed -o /etc/apt/sources.list.d/presage-technologies.list \
    "https://presage-security.github.io/PPA/presage-technologies.list" && \
    apt-get update && \
    apt-get install -y libphysiologyedge-dev && \
    apt-get install -y libsmartspectra-dev=2.0.4

# Download header-only dependencies
RUN wget -q https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h \
    -O deps/httplib.h && \
    wget -q https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp \
    -O deps/json.hpp

# Copy startup script
COPY start-server.sh /app/start-server.sh

# Run server automatically
CMD ["/app/start-server.sh"]
```

### docker-compose.yml Configuration

```yaml
services:
  presage_core:
    platform: linux/amd64        # CRITICAL: Enables amd64 emulation on ARM64
    build:
      context: .
      dockerfile: Dockerfile
    container_name: presage_engine
    privileged: true             # Required for device access (if using camera)
    ports:
      - "8080:8080"              # Map container port to host
    env_file:
      - .env                     # Load API key from .env file
    volumes:
      - ./uploads:/app/uploads   # Persist uploaded videos
      - .:/app                   # Mount source code for development
    restart: unless-stopped      # Auto-restart on failure
```

**Key Configuration Points:**

1. **`platform: linux/amd64`** - **Essential for Apple Silicon Macs**
   - Without this, Docker tries to build for `aarch64`
   - Presage SDK packages are `amd64` only
   - QEMU emulation handles architecture translation

2. **`privileged: true`** - Required for camera device access
   - Allows container to access `/dev/video0`
   - Not needed if only processing video files

3. **Volume Mounts:**
   - `./uploads:/app/uploads` - Persist video files
   - `.:/app` - Mount source code (enables live code editing)

---

## SDK Installation Process

### Step-by-Step Installation

When the Docker container builds, it performs these steps:

#### 1. Add Presage Repository

```bash
# Add GPG key for package verification
curl -s "https://presage-security.github.io/PPA/KEY.gpg" | \
    gpg --dearmor | \
    tee /etc/apt/trusted.gpg.d/presage-technologies.gpg >/dev/null

# Add repository to apt sources
curl -s --compressed -o /etc/apt/sources.list.d/presage-technologies.list \
    "https://presage-security.github.io/PPA/presage-technologies.list"
```

#### 2. Install Dependencies

The SDK requires `libphysiologyedge-dev` to be installed first:

```bash
apt-get update
apt-get install -y libphysiologyedge-dev
```

**Why first?** `libsmartspectra-dev` depends on `libphysiologyedge-dev`.

#### 3. Install SDK

```bash
apt-get install -y libsmartspectra-dev=2.0.4
```

**Version pinning:** We use `=2.0.4` to ensure compatibility and avoid dependency conflicts.

#### 4. Dependency Chain

The SDK installation brings in:
- **OpenCV 4.10.0** (Presage's custom build)
  - Conflicts with Ubuntu's default OpenCV 4.5.4
  - Presage version is installed, Ubuntu version is not
- **OpenGL/GLES3 libraries** (for GPU acceleration)
- **V4L libraries** (for video capture)
- **CURL/OpenSSL** (for REST API communication)

### Installation Verification

After installation, verify SDK is available:

```bash
# Check if packages are installed
dpkg -l | grep smartspectra
dpkg -l | grep physiologyedge

# Check if libraries are available
ldconfig -p | grep smartspectra

# Check CMake can find SDK
find /usr -name "*SmartSpectra*.cmake"
```

---

## Build System

### CMake Configuration

The `CMakeLists.txt` file configures the build:

```cmake
cmake_minimum_required(VERSION 3.27.0)  # SDK requires 3.27.0+
project(PresageEngine CXX)

# Find Presage SDK
find_package(SmartSpectra REQUIRED)
find_package(OpenCV REQUIRED)

# Build main server
add_executable(presage_engine main.cpp)
target_compile_definitions(presage_engine PRIVATE PRESAGE_SDK_AVAILABLE)
target_link_libraries(presage_engine
    SmartSpectra::Container
    SmartSpectra::Gui
    ${OpenCV_LIBS}
    pthread
)

# Build test program
add_executable(hello_vitals hello_vitals.cpp)
target_link_libraries(hello_vitals
    SmartSpectra::Container
    SmartSpectra::Gui
    ${OpenCV_LIBS}
)
```

### Build Process

The `start-server.sh` script handles building:

```bash
#!/bin/bash
cd /app

# Build if executable doesn't exist
if [ ! -f "build/presage_engine" ]; then
    echo "Building Presage Engine..."
    mkdir -p build
    cd build
    cmake ..
    make -j$(nproc)
    cd ..
fi

# Start the server
cd build
exec ./presage_engine
```

**Build Steps:**
1. Check if `build/presage_engine` exists
2. If not, create build directory
3. Run `cmake ..` to configure
4. Run `make -j$(nproc)` to compile
5. Execute the server

---

## Running the Server

### Automatic Startup (Recommended)

The server starts automatically when the container starts:

```bash
cd presage-engine
docker-compose up -d
```

**What happens:**
1. Docker builds/uses the image
2. Container starts
3. `start-server.sh` runs automatically
4. Server builds (if needed) and starts on port 8080
5. Port 8080 is exposed to your host machine

### Manual Startup

If you need to run manually for debugging:

```bash
# Enter container
docker-compose exec presage_core /bin/bash

# Build manually
cd /app/build
cmake ..
make -j$(nproc)

# Run server
./presage_engine
```

### Verifying Server is Running

```bash
# Health check
curl http://localhost:8080/health
# Should return: OK

# Check status
curl http://localhost:8080/status
# Returns JSON with SDK status
```

### Viewing Logs

```bash
# Follow logs
docker-compose logs -f

# View last 50 lines
docker-compose logs --tail=50
```

---

## Troubleshooting

### "CMake 3.27.0 or higher is required"

**Problem:** Ubuntu 22.04 comes with CMake 3.22.1, but SDK requires 3.27.0+

**Solution:** Dockerfile installs CMake 3.27.0+ from Kitware repository automatically.

**Manual fix:**
```bash
# Inside container
apt-get remove --purge cmake
wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc | \
    gpg --dearmor - | tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null
echo "deb https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main" | \
    tee /etc/apt/sources.list.d/kitware.list >/dev/null
apt-get update
apt-get install -y cmake
```

### "Unable to locate package libsmartspectra-dev"

**Problem:** Repository not added or GPG key missing.

**Solution:** Check Dockerfile includes repository setup steps. Verify:
```bash
# Inside container
ls /etc/apt/sources.list.d/presage-technologies.list
ls /etc/apt/trusted.gpg.d/presage-technologies.gpg
```

### "libopencv-dev conflicts with opencv-data"

**Problem:** Presage SDK provides its own OpenCV 4.10.0, which conflicts with Ubuntu's OpenCV 4.5.4.

**Solution:** Dockerfile removes Ubuntu's OpenCV before installing Presage SDK. This is handled automatically.

### "libunwind.so not found"

**Problem:** Missing `libunwind-dev` package.

**Solution:** Dockerfile includes `libunwind-dev` in dependencies. If missing:
```bash
apt-get install -y libunwind-dev
```

### Architecture Mismatch Errors

**Problem:** On Apple Silicon Mac, getting `aarch64` vs `amd64` errors.

**Solution:** Ensure `docker-compose.yml` has:
```yaml
platform: linux/amd64
```

Then rebuild:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Server Won't Start

**Check logs:**
```bash
docker-compose logs --tail=50
```

**Common issues:**
- Missing API key: Check `.env` file has `PRESAGE_API_KEY=your-key`
- Port already in use: `lsof -i :8080` to find process
- Build failed: Check CMake/compilation errors in logs

### SDK Not Found at Runtime

**Problem:** Libraries not in library path.

**Solution:**
```bash
# Inside container
ldconfig
# Verify libraries
ldconfig -p | grep smartspectra
```

---

## Key Takeaways

1. **Docker is essential** - SDK only works on Linux (Ubuntu 22.04)
2. **Platform emulation** - Use `linux/amd64` on Apple Silicon Macs
3. **SDK from PPA** - Installed from Presage's official repository
4. **Dependency order matters** - Install `libphysiologyedge-dev` before `libsmartspectra-dev`
5. **CMake 3.27.0+ required** - Installed from Kitware repository
6. **Automatic startup** - Server builds and runs automatically via `start-server.sh`
7. **Volume mounts** - Source code mounted for live editing, uploads persisted

---

## Additional Resources

- [Presage SmartSpectra SDK Documentation](https://github.com/Presage-Security/SmartSpectra)
- [Docker Platform Emulation](https://docs.docker.com/build/building/multi-platform/)
- [CMake Installation Guide](https://cmake.org/install/)

---

**Last Updated:** January 2025  
**SDK Version:** 2.0.4  
**Ubuntu Version:** 22.04 (Jammy)  
**Docker Platform:** linux/amd64
