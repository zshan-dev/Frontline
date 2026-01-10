cmake_minimum_required(VERSION 3.16.0)
project(PresageEngine CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(OpenCV REQUIRED)
find_package(Threads REQUIRED)

# Try to find Presage/SmartSpectra SDK
# Common library names: libpresage, libsmartspectra
find_library(PRESAGE_LIB
    NAMES presage smartspectra SmartSpectra
    PATHS /usr/lib /usr/local/lib
    PATH_SUFFIXES lib
)

# Try to find SmartSpectra via CMake config
find_package(SmartSpectra QUIET)

# Include directories
include_directories(${OpenCV_INCLUDE_DIRS})
include_directories(deps)

# Create executable
add_executable(presage_engine main.cpp)

# Link libraries
target_link_libraries(presage_engine
    ${OpenCV_LIBS}
    Threads::Threads
)

# Link Presage SDK if found
if(PRESAGE_LIB)
    message(STATUS "Found Presage library: ${PRESAGE_LIB}")
    target_link_libraries(presage_engine ${PRESAGE_LIB})
    target_compile_definitions(presage_engine PRIVATE PRESAGE_SDK_AVAILABLE)
elseif(TARGET SmartSpectra::Container)
    message(STATUS "Found SmartSpectra via CMake")
    target_link_libraries(presage_engine
        SmartSpectra::Container
        SmartSpectra::Gui
    )
    target_compile_definitions(presage_engine PRIVATE PRESAGE_SDK_AVAILABLE)
else()
    message(WARNING "Presage SDK not found. Application will compile with stubs.")
    message(STATUS "Looking for SDK in: /usr/lib, /usr/local/lib")
    message(STATUS "Install presage-sdk.deb in libs/ directory and rebuild.")
endif()

# Add compile definitions if needed
target_compile_definitions(presage_engine PRIVATE
    OPENCV_TRAITS_ENABLE_DEPRECATED
)
