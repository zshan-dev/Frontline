cmake_minimum_required(VERSION 3.27.0)
project(PresageEngine CXX)
 
# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
 
# Find required packages
find_package(SmartSpectra REQUIRED)
find_package(OpenCV REQUIRED)
 
# Include directories for header-only libraries
include_directories(deps)
 
# Build main server executable (presage_engine)
add_executable(presage_engine main.cpp)
target_compile_definitions(presage_engine PRIVATE PRESAGE_SDK_AVAILABLE)
target_link_libraries(presage_engine
    SmartSpectra::Container
    SmartSpectra::Gui
    ${OpenCV_LIBS}
    pthread  # httplib needs pthread
)
 
# Build test executable (hello_vitals)
add_executable(hello_vitals hello_vitals.cpp)
target_link_libraries(hello_vitals
    SmartSpectra::Container
    SmartSpectra::Gui
    ${OpenCV_LIBS}
)