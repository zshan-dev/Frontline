#!/bin/bash
set -e

cd /app

# Build if needed
if [ ! -f "build/presage_engine" ]; then
    echo "Building Presage Engine..."
    mkdir -p build
    cd build
    cmake ..
    make -j$(nproc)
    cd ..
fi

# Start the server
echo "Starting Presage Engine server..."
cd build
exec ./presage_engine
