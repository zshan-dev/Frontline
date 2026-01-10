import express from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-vision' });

// Setup temp directories
const TEMP_DIR = path.join(__dirname, 'tmp');
const FRAMES_DIR = path.join(TEMP_DIR, 'frames');

// Ensure temp directories exist
async function ensureDirs() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(FRAMES_DIR, { recursive: true });
}

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}.${file.originalname.split('.').pop()}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp4', '.webm'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 and WebM files are allowed'));
    }
  }
});

// Extract frames using ffmpeg
async function extractFrames(videoPath, outputDir) {
  // Verify video file exists before processing
  try {
    await fs.access(videoPath);
  } catch (err) {
    throw new Error(`Video file does not exist: ${videoPath}`);
  }

  const timestamps = [0, 3, 6, 9]; // seconds
  const framePaths = [];

  for (const timestamp of timestamps) {
    const framePath = path.join(outputDir, `frame-${timestamp}s.jpg`);
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: `frame-${timestamp}s.jpg`,
          folder: outputDir,
          size: '800x600'
        })
        .on('end', () => {
          framePaths.push(framePath);
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  return framePaths.filter(p => p); // Filter out any null/undefined
}

// Convert image to base64 for Gemini
async function imageToBase64(imagePath) {
  const imageBuffer = await fs.readFile(imagePath);
  return imageBuffer.toString('base64');
}

// Analyze frames with Gemini
async function analyzeFrames(framePaths) {
  const prompt = `Analyze these frames for visible injuries, blood loss, and body position. Return JSON with:
injury_types (string[]),
bleeding_level (none|mild|moderate|severe),
body_position (string),
urgency_level (low|medium|high|critical),
notes (string),
confidence (0-1).`;

  // Prepare image parts
  const imageParts = [];
  for (const framePath of framePaths) {
    try {
      const base64 = await imageToBase64(framePath);
      const mimeType = 'image/jpeg';
      imageParts.push({
        inlineData: {
          data: base64,
          mimeType
        }
      });
    } catch (err) {
      console.error(`Error reading frame ${framePath}:`, err);
    }
  }

  if (imageParts.length === 0) {
    throw new Error('No valid frames to analyze');
  }

  // Call Gemini API
  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();

  // Try to parse JSON from response
  try {
    // Extract JSON from markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.includes('```')) {
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    }
    
    const analysis = JSON.parse(jsonText);
    return { success: true, analysis, rawText: text };
  } catch (parseError) {
    // If JSON parsing fails, return error with raw text
    return { 
      success: false, 
      analysis: null, 
      rawText: text,
      parseError: parseError.message 
    };
  }
}

// Cleanup temp files
async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (err) {
      console.error(`Error deleting ${file}:`, err);
    }
  }
}

// Main route
app.post('/analyze-video', upload.single('video'), async (req, res) => {
  const videoPath = req.file?.path;
  const presageDataStr = req.body?.presageData;

  const filesToCleanup = [];
  const errors = [];

  try {
    // Validate inputs
    if (!videoPath) {
      return res.status(400).json({
        ok: false,
        analysis: null,
        presage: null,
        framesUsed: 0,
        debug: { errors: ['No video file provided'] }
      });
    }

    filesToCleanup.push(videoPath);

    // Verify video file exists and is accessible
    try {
      const videoStats = await fs.stat(videoPath);
      if (videoStats.size === 0) {
        return res.status(400).json({
          ok: false,
          analysis: null,
          presage: null,
          framesUsed: 0,
          debug: { errors: ['Video file is empty'] }
        });
      }
      console.log(`Video file saved: ${videoPath} (${videoStats.size} bytes)`);
    } catch (statError) {
      return res.status(500).json({
        ok: false,
        analysis: null,
        presage: null,
        framesUsed: 0,
        debug: { errors: [`Video file not accessible: ${statError.message}`] }
      });
    }

    // Parse presageData
    let presage = null;
    if (presageDataStr) {
      try {
        presage = JSON.parse(presageDataStr);
      } catch (err) {
        errors.push(`Failed to parse presageData: ${err.message}`);
      }
    }

    // Extract frames
    let framePaths = [];
    try {
      framePaths = await extractFrames(videoPath, FRAMES_DIR);
      filesToCleanup.push(...framePaths);
    } catch (err) {
      errors.push(`Frame extraction failed: ${err.message}`);
      return res.status(500).json({
        ok: false,
        analysis: null,
        presage,
        framesUsed: 0,
        debug: { errors }
      });
    }

    if (framePaths.length === 0) {
      return res.status(500).json({
        ok: false,
        analysis: null,
        presage,
        framesUsed: 0,
        debug: { errors: ['No frames extracted'] }
      });
    }

    // Analyze with Gemini
    const geminiResult = await analyzeFrames(framePaths);

    if (!geminiResult.success) {
      return res.json({
        ok: false,
        analysis: {
          injury_types: [],
          bleeding_level: 'none',
          body_position: 'unknown',
          urgency_level: 'low',
          notes: `Gemini response was not valid JSON. Raw output: ${geminiResult.rawText.substring(0, 500)}... Parse error: ${geminiResult.parseError}`,
          confidence: 0
        },
        presage,
        framesUsed: framePaths.length,
        debug: { 
          errors: [`JSON parsing failed: ${geminiResult.parseError}`],
          rawGeminiOutput: geminiResult.rawText.substring(0, 1000)
        }
      });
    }

    // Success response
    res.json({
      ok: true,
      analysis: geminiResult.analysis,
      presage,
      framesUsed: framePaths.length
    });

  } catch (error) {
    errors.push(error.message);
    res.status(500).json({
      ok: false,
      analysis: null,
      presage: presageDataStr ? (presage || presageDataStr) : null,
      framesUsed: 0,
      debug: { errors }
    });
  } finally {
    // Cleanup temp files
    await cleanupFiles(filesToCleanup);
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'video-injury-analysis' });
});

// Initialize and start server
ensureDirs().then(() => {
  app.listen(PORT, () => {
    console.log(`Video Injury Analysis service running on port ${PORT}`);
    console.log(`POST /analyze-video - Analyze video for injuries`);
    console.log(`GET /health - Health check`);
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});
