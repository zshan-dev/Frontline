FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libopencv-dev \
    v4l-utils \
    libssl-dev \
    git \
    wget \
    curl \
    ca-certificates \
    libgoogle-glog-dev \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Presage SDK from official repository (if available)
# Note: Repository access may require authentication or the package may not be publicly available
RUN echo "Attempting to install Presage SDK from official repository..." && \
    (curl -s "https://presage-security.github.io/PPA/KEY.gpg" | gpg --dearmor | tee /etc/apt/trusted.gpg.d/presage-technologies.gpg >/dev/null || echo "Warning: Failed to add GPG key") && \
    (curl -s --compressed -o /etc/apt/sources.list.d/presage-technologies.list "https://presage-security.github.io/PPA/presage-technologies.list" || echo "Warning: Failed to add repository") && \
    apt-get update && \
    (apt-get install -y libsmartspectra-dev && echo "Presage SDK installed successfully" || \
     (echo "Warning: libsmartspectra-dev package not found in repository." && \
      echo "This may be because:" && \
      echo "  1. Repository requires authentication/access" && \
      echo "  2. Package name is different" && \
      echo "  3. Package not available for this architecture" && \
      echo "Build will continue, but SDK must be installed manually." && \
      echo "Check Presage documentation for correct installation method."))

# Set working directory
WORKDIR /app

# Create uploads directory for video files
RUN mkdir -p /app/uploads

# Copy source files
COPY CMakeLists.txt main.cpp ./

# Download single-header dependencies
RUN mkdir -p deps && \
    wget -q https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h -O deps/httplib.h && \
    wget -q https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp -O deps/json.hpp

# Build the application
RUN mkdir -p build && \
    cd build && \
    cmake .. && \
    make -j$(nproc)

# Expose port
EXPOSE 8080

# Run the application
CMD ["./build/presage_engine"]
