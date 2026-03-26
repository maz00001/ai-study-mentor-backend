// ============================================================
//  AI Study Mentor — Backend Server
//  File: server.js
//  Description: Express server that connects to Google Gemini
//  and returns AI-generated study plans.
// ============================================================

// Load environment variables from .env file (only in development)
require("dotenv").config();

const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──────────────────────────────────────────────

// Allow your GitHub Pages frontend to call this backend.
// Replace the URL below with your actual GitHub Pages URL.
const allowedOrigins = [
  "https://YOUR-USERNAME.github.io",  // ← change this
  "http://localhost:5500",            // for local development
  "http://127.0.0.1:5500"            // for VS Code Live Server
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  }
}));

// Parse incoming JSON request bodies
app.use(express.json());


// ── HEALTH CHECK ────────────────────────────────────────────
// Visit http://localhost:3000/ to confirm the server is running
app.get("/", (req, res) => {
  res.json({ message: "AI Study Mentor backend is running ✅" });
});


// ── POST /generate-study-plan ────────────────────────────────
//
//  Receives: { courseName, examDate }
//  Returns:  { studyPlan: "..." }
//
app.post("/generate-study-plan", async (req, res) => {
  const { courseName, examDate } = req.body;

  // --- 1. Validate inputs ---
  if (!courseName || !examDate) {
    return res.status(400).json({
      error: "Please provide both courseName and examDate."
    });
  }

  // --- 2. Calculate days until exam ---
  const today    = new Date();
  const examDay  = new Date(examDate);
  const daysLeft = Math.ceil((examDay - today) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return res.status(400).json({ error: "Exam date must be in the future." });
  }

  // --- 3. Build the prompt for Gemini ---
  const prompt = `
You are an expert academic tutor helping a Nigerian university student prepare for their exam.

The student is studying: ${courseName}
Days until exam: ${daysLeft} (Exam date: ${examDate})

Create a clear, practical, day-by-day study plan. Structure it like this:

## Study Plan: ${courseName}

**Overview**
Write 2 encouraging sentences about the plan.

## Phase 1: Foundation (Days 1–${Math.floor(daysLeft * 0.4)})
List daily reading topics and goals for this phase.

## Phase 2: Practice (Days ${Math.floor(daysLeft * 0.4) + 1}–${Math.floor(daysLeft * 0.75)})
List daily practice sessions and past question work.

## Phase 3: Revision (Days ${Math.floor(daysLeft * 0.75) + 1}–${daysLeft})
List daily revision tasks. Include a rest day before the exam.

## Quick Tips for ${courseName}
Give 3 specific study tips for this subject.

Keep the language simple, warm, and motivating for a Nigerian student.
`;

  // --- 4. Call the Google Gemini API ---
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return res.status(500).json({
        error: "Server configuration error: GEMINI_API_KEY is not set."
      });
    }

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,      // Balanced creativity
          maxOutputTokens: 1500  // Enough for a full study plan
        }
      })
    });

    // If Gemini returned an error, forward it
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error("Gemini API error:", errorData);
      return res.status(502).json({
        error: "Failed to get a response from Gemini. Check your API key."
      });
    }

    const geminiData = await geminiResponse.json();

    // --- 5. Extract the text from Gemini's response ---
    const studyPlan =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!studyPlan) {
      return res.status(502).json({
        error: "Gemini returned an empty response. Please try again."
      });
    }

    // --- 6. Send the study plan back to the frontend ---
    res.json({ studyPlan });

  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({
      error: "An unexpected server error occurred. Please try again."
    });
  }
});


// ── START SERVER ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ AI Study Mentor backend running!`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Test:  http://localhost:${PORT}/\n`);
});
