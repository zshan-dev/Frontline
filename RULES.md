🎯 Goal (The "Presage" Upgrade)
Prove that a standard smartphone web app can instantly perform a "Touchless Triage" by combining computer vision with biometric sensing.
See the Scene (Gemini: Injury/Context)
Sense the Patient (Presage: Heart Rate, Breathing, Focus)
Generate the Report (Node.js: Aggregates data for ER handoff)

🧱 System Architecture (React + Node.js)
This architecture keeps the heavy lifting on the client (Presage) and the API management on the server (Node), ensuring a fast, clean hackathon build.
Frontend (React / Vite):
Handles Camera access.
Presage SDK runs here (Client-side) to extract vitals in real-time.
Displays the live "Scanning..." UI and final Report.
Backend (Node.js / Express):
Receives the image frame + Presage data payload.
Calls Gemini Flash (for speed) to analyze the image.
Calls ElevenLabs to generate audio.
Report Logic: Merges Vitals (Presage) + Visuals (Gemini) into a structured JSON Incident Report.

🔁 MVP FLOW (Step-by-Step)
1️⃣ User Action: The "10-Second Scan"
User: Opens web app and points camera at the victim.
UI: Shows a "Scanning Vitals..." progress bar (10 seconds).
Why: Presage needs a continuous video stream to detect micro-changes in skin color (rPPG) and head movement.
2️⃣ Presage: Biometric Signal Extraction (Client-Side)
Action: While the scan is running, the Presage SDK analyzes the video feed directly in the browser.
Extracted Data (The "Super Powers"):
Heart Rate (HR): e.g., "110 BPM" (Tachycardia).
Breathing Rate (RR): e.g., "28 breaths/min" (Hyperventilation).
Attention/Focus: Used as a proxy for Consciousness (e.g., Low Focus = Disoriented/Unconscious).
3️⃣ Gemini: Visual Injury Analysis (Server-Side)
Action: At the end of the 10 seconds, the React app snaps one high-quality frame and sends it + the Presage data to your Node.js backend.
Node.js: Sends the image to Gemini Vision.
Prompt: "Analyze this image for visible injuries, blood loss, and body position. Return JSON."
4️⃣ Node.js: The "Incident Report" Engine
Action: The Node backend combines the Physiology (from Presage) and Physics (from Gemini) into a unified Incident Report Object.
Logic:
If Blood = Visible (Gemini) AND Heart Rate = High (Presage) -> Flag as "Possible Shock".
Output Generation:
Constructs the JSON Report.
Generates the specific First Aid script (text).
Sends text to ElevenLabs for audio.
5️⃣ Final Output: Audio + The "ER Ticket"
Audio: App speaks the instructions: "Patient showing signs of shock. Elevate legs."
Screen: Displays the Digital Incident Report (see below).

📄 The "ER-Ready" Incident Report (UI Design)
This is what the user sees on their screen to show the Paramedics/ER.
🚨 INCIDENT HANDOFF REPORT #402
Timestamp: 10:42 AM
📊 VITALS (Measured by Presage)
Heart Rate: 112 BPM 🔴 High
Respiration: 24/min 🟡 Elevated
Status: Disoriented (Low Focus Score)
👁️ VISUALS (Verified by Gemini)
Injury: Deep laceration, right forearm.
Bleeding: Active/Moderate.
Position: Supine (Lying on back).
📝 IMMEDIATE ACTIONS TAKEN
Pressure applied to wound.
Legs elevated (Shock protocol).
Patient kept warm.
(Button: "Copy for EMS" or "Export JSON")

🛠️ Hackathon Tech Stack (Cheat Sheet)
Component
Technology
Role
Frontend
React (Vite)
UI, Camera handling, State management
Sensing
Presage SDK
Crucial: Extracts HR, RR, and Focus from video feed
Backend
Node.js (Express)
API Orchestrator, Secret Key management
Vision
Gemini 1.5 Flash
Image-to-Text (Injury detection)
Voice
ElevenLabs
Text-to-Speech (Calm, authoritative voice)
Styling
Tailwind CSS
Fast, clean medical UI

💡 Hackathon Tip: "Fake" the Report Persistence
For the MVP, you don't need a database (MongoDB/Postgres). Just generate the report in Node.js and send it back to the React frontend to display immediately. If the user refreshes, it's gone—that is perfectly fine for a 72-hour MVP. Focus on the live generation of the report.

