# AI-Powered Mock Interview Platform 🤖🎤

![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20Gemini%20AI-blue)

## 📌 Problem Statement
In today’s competitive hiring ecosystem, interview readiness is no longer just about subject knowledge—it is about **adaptability, communication, time management, and consistency**. 

Most students struggle due to:
*   Lack of realistic practice.
*   Unstructured feedback.
*   No measurement of performance under pressure.
*   Inability to adapt to varying difficulty levels.

## 🚀 The Solution
An AI-Powered Mock Interview Platform that simulates a real-world interview environment. The system acts as a **real-time AI Interviewer** that asks relevant technical questions, listens to your specific answers (via Voice), evaluates them instantly, and adapts the difficulty based on your performance.

## ✨ Key Features
*   **🧠 AI-Driven Interviewer**: Powered by Google Gemini 1.5/2.0 Flash.
*   **🗣️ Voice-First Interface**: Real-time Speech-to-Text (STT) and Text-to-Speech (TTS) for a natural conversation flow.
*   **📄 Resume & JD Analysis**: Customizes questions based on your specific CV and the target Job Description.
*   **📈 Adaptive Difficulty**: Questions get harder as you answer correctly, simulating a real interviewer probing your depth.
*   **👀 Face Tracking**: Uses MediaPipe to ensure you are facing the camera and maintaining eye contact (Focus tracking).
*   **📊 Comprehensive Analysis**:
    *   **Readiness Score (0-100)**
    *   **Strengths & Weaknesses** 
    *   **Hiring Recommendation** (Strong Hire / No Hire)
    *   **Skill Breakdown**

## 🛠️ Tech Stack
*   **Frontend**: Next.js 14 (App Router), TailwindCSS, Socket.IO Client, MediaPipe (Face Mesh).
*   **Backend**: Python FastAPI, Python-SocketIO, Google Gemini API (`google-genai`).
*   **AI Model**: Gemini 1.5 Flash (Optimized for low latency).

## 🎥 Demo Video
> *[Insert Link to Screen Recording Here]*

## 🚀 Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   Python (v3.9+)
*   Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/AI_Interview_platform.git
cd AI_Interview_platform
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env
```
**Run the Server:**
```bash
python -m uvicorn main:socket_app --reload
```
*Server will start at `http://localhost:8000`*

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > .env.local
```
**Run the Client:**
```bash
npm run dev
```
*Client will start at `http://localhost:3000`*

## 📝 Usage Guide
1.  **Landing Page**: Upload your Resume (Text/PDF content) and Paste the Job Description.
2.  **Interview Room**: 
    *   Allow Camera/Microphone permissions.
    *   The AI will analyze your profile and start the interview.
    *   Listen to the question, then speak your answer clearly.
    *   Click **"Stop Recording"** when finished to submit your answer.
3.  **Analysis**: After the session (default 2 questions for demo), you will be redirected to the Analysis Dashboard to view your detailed report.


