// hello_vitals.cpp
// SmartSpectra Hello Vitals - Minimal Example
 
#include <smartspectra/container/foreground_container.hpp>
#include <smartspectra/container/settings.hpp>
#include <smartspectra/gui/opencv_hud.hpp>
#include <physiology/modules/messages/metrics.h>
#include <physiology/modules/messages/status.h>
#include <glog/logging.h>
#include <opencv2/opencv.hpp>
#include <iostream>
 
using namespace presage::smartspectra;
 
int main(int argc, char** argv) {
    // Initialize logging
    google::InitGoogleLogging(argv[0]);
    FLAGS_alsologtostderr = true;
    
    // Get API key
    std::string api_key;
    std::string video_path = "/app/uploads/test-video.mp4";  // Default video path
    
    if (argc > 1) {
        api_key = argv[1];
    } else if (const char* env_key = std::getenv("SMARTSPECTRA_API_KEY")) {
        api_key = env_key;
    } else {
        std::cout << "Usage: ./hello_vitals YOUR_API_KEY [video_file_path]\n";
        std::cout << "Or set SMARTSPECTRA_API_KEY environment variable\n";
        std::cout << "Get your API key from: https://physiology.presagetech.com\n";
        std::cout << "Video file path is optional (default: /app/uploads/test-video.mp4)\n";
        return 1;
    }
    
    // Get video file path if provided
    if (argc > 2) {
        video_path = argv[2];
    }
    
    std::cout << "Using video file: " << video_path << "\n";
    
    std::cout << "Starting SmartSpectra Hello Vitals...\n";
    
    try {
        // Create settings
        container::settings::Settings<
            container::settings::OperationMode::Continuous,
            container::settings::IntegrationMode::Rest
        > settings;
        
        // Configure video file input (instead of camera)
        settings.video_source.device_index = -1;  // Disable camera device
        // NOTE: If capture_width and/or capture_height is
        //     modified the HUD will also need to be changed
        settings.video_source.capture_width_px = 1280;
        settings.video_source.capture_height_px = 720;
        settings.video_source.codec = presage::camera::CaptureCodec::MJPG;
        settings.video_source.auto_lock = true;
        settings.video_source.input_video_path = video_path;  // Use video file
        settings.video_source.input_video_time_path = "";
        
        // Basic settings
        settings.headless = true;  // Run in headless mode (no GUI)
        settings.enable_edge_metrics = true;
        settings.verbosity_level = 1;
        
        // Continuous mode buffer
        settings.continuous.preprocessed_data_buffer_duration_s = 0.5;
        
        // API key for REST
        settings.integration.api_key = api_key;
        
        // Create container
        auto container = std::make_unique<container::CpuContinuousRestForegroundContainer>(settings);
        auto hud = std::make_unique<gui::OpenCvHud>(10, 0, 1260, 400);
        
        // Set up callbacks
        // NOTE: If code in callbacks adds more than 75ms of delay it might affect
        //       incoming data.
        auto status = container->SetOnCoreMetricsOutput(
            [&hud](const presage::physiology::MetricsBuffer& metrics, int64_t timestamp) {
                float pulse;
                float breathing;
                if (!metrics.pulse().rate().empty()){
                    pulse = metrics.pulse().rate().rbegin()->value();
                }
                if (!metrics.breathing().rate().empty()){
                    breathing = metrics.breathing().rate().rbegin()->value();
                }
                
                if (!metrics.pulse().rate().empty() && !metrics.breathing().rate().empty()){
                    std::cout << "Vitals - Pulse: " << pulse << " BPM, Breathing: " << breathing << " BPM\n";
                }
                hud->UpdateWithNewMetrics(metrics);
                return absl::OkStatus();
            }
        ); 
        if (!status.ok()) {
            std::cerr << "Failed to set metrics callback: " << status.message() << "\n";
            return 1;
        }
        
        status = container->SetOnVideoOutput(
            [&hud](cv::Mat& frame, int64_t timestamp) {
                // In headless mode, we don't display frames
                // Just process the video without GUI
                // cv::imshow("SmartSpectra Hello Vitals", frame);  // Disabled for headless mode
                
                // No keyboard input in headless mode
                // char key = cv::waitKey(1) & 0xFF;
                // if (key == 'q' || key == 27) {
                //     return absl::CancelledError("User quit");
                // }
                return absl::OkStatus();
            }
        ); 
        if (!status.ok()) {
            std::cerr << "Failed to set video callback: " << status.message() << "\n";
            return 1;
        }
        
        status = container->SetOnStatusChange(
            [](presage::physiology::StatusValue imaging_status) {
                std::cout << "Imaging/processing status: " << presage::physiology::GetStatusDescription(imaging_status.value()) << "\n";
                return absl::OkStatus();
            }
        ); 
        if(!status.ok()) {
            std::cerr << "Failed to set status callback: " << status.message() << "\n";
            return 1;
        }
        
        // Initialize and run
        std::cout << "Initializing video processing...\n";
        if (auto status = container->Initialize(); !status.ok()) {
            std::cerr << "Failed to initialize: " << status.message() << "\n";
            return 1;
        }
        
        std::cout << "Processing video file...\n";
        std::cout << "Vitals will be printed to console as they are calculated.\n";
        if (auto status = container->Run(); !status.ok()) {
            std::cerr << "Processing failed: " << status.message() << "\n";
            return 1;
        }
        
        // No windows to destroy in headless mode
        // cv::destroyAllWindows();
        std::cout << "Done!\n";
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
}