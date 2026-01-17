FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install basic tools and SDK dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gpg \
    lsb-release \
    software-properties-common \
    build-essential \
    git \
    vim \
    pkg-config \
    libcurl4-openssl-dev \
    libssl-dev \
    libv4l-dev \
    libgl1-mesa-dev \
    libgles2-mesa-dev \
    libegl1-mesa-dev \
    libunwind-dev \
    && rm -rf /var/lib/apt/lists/*

# Install CMake 3.27.0 (required for SmartSpectra SDK)
RUN apt-get remove --purge --auto-remove cmake -y 2>/dev/null || true && \
    wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | gpg --dearmor - | tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null && \
    echo "deb https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/kitware.list >/dev/null && \
    apt-get update && \
    apt-get install -y cmake && \
    rm -rf /var/lib/apt/lists/*

# Install Presage SmartSpectra SDK
RUN curl -s "https://presage-security.github.io/PPA/KEY.gpg" | gpg --dearmor | tee /etc/apt/trusted.gpg.d/presage-technologies.gpg >/dev/null && \
    curl -s --compressed -o /etc/apt/sources.list.d/presage-technologies.list "https://presage-security.github.io/PPA/presage-technologies.list" && \
    apt-get update && \
    apt-get install -y libphysiologyedge-dev && \
    apt-get install -y libsmartspectra-dev=2.0.4 && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Download single-header dependencies for main.cpp (httplib and json)
RUN mkdir -p deps && \
    wget -q https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h -O deps/httplib.h && \
    wget -q https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp -O deps/json.hpp

# Copy startup script
COPY start-server.sh /app/start-server.sh
RUN chmod +x /app/start-server.sh

# Run the server automatically
CMD ["/app/start-server.sh"]
