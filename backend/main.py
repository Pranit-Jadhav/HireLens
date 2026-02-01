import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import os
from interview_manager import SessionManager, InterviewState
from ai_service import AIService
from audio_service import AudioService

# Initialize FastAPI
app = FastAPI(title="AI Interviewer Backend")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REST Endpoints for Postman Testing ---
from pydantic import BaseModel

class TestRequest(BaseModel):
    resume: str
    jd: str

@app.post("/api/test-analysis")
async def test_analysis(request: TestRequest):
    print("Received test-analysis request")
    analysis = await ai_service.parse_resume_and_jd(request.resume, request.jd)
    if not analysis:
        return {"status": "error", "message": "Analysis failed check console logs"}
    return {"status": "success", "data": analysis}

@app.post("/api/test-questions")
async def test_questions(request: TestRequest):
    analysis = await ai_service.parse_resume_and_jd(request.resume, request.jd)
    if not analysis:
        return {"status": "error", "message": "Analysis failed"}
    questions = await ai_service.generate_questions(analysis)
    return {"status": "success", "count": len(questions), "questions": questions}
# -------------------------------------------

# Basic Health Check
@app.get("/")
async def root():
    return {"message": "AI Interview Platform Backend Running"}

# Services
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)
session_manager = SessionManager()
ai_service = AIService()
audio_service = AudioService()

@app.get("/")
def read_root():
    return {"status": "online", "message": "AI Interviewer Backend Ready"}

# Socket.IO Events
@sio.on("connect")
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit("message", {"data": "Connected to AI Interviewer"}, to=sid)

@sio.on("disconnect")
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    session_manager.delete_session(sid)

@sio.on("start_session")
async def start_session(sid, data):
    print(f"DEBUG: start_session called for {sid}")
    print(f"DEBUG: Session Data keys: {data.keys()}")
    
    session_id = session_manager.create_session()
    # We'll map sid to session for simplicity
    session = session_manager.get_session(session_id)
    
    session_manager.sessions[sid] = session_manager.sessions.pop(session_id) 
    session = session_manager.sessions[sid]
    session.session_id = sid
    
    resume_text = data.get("resume", "")
    jd_text = data.get("jd", "")
    session.resume_text = resume_text
    session.job_description = jd_text
    
    await sio.emit("status", {"state": "ANALYZING_RESUME"}, to=sid)
    print("DEBUG: Emitted ANALYZING_RESUME")
    
    # 1. Parse Resume/JD
    print("DEBUG: Calling parse_resume_and_jd")
    analysis = await ai_service.parse_resume_and_jd(resume_text, jd_text)
    print(f"DEBUG: Analysis result: {analysis}")
    
    if not analysis:
        print("ERROR: Analysis failed or returned empty.")
        await sio.emit("status", {"state": "ERROR_ANALYSIS_FAILED"}, to=sid)
        return

    # 2. Generate Questions
    print("DEBUG: Calling generate_questions")
    questions = await ai_service.generate_questions(analysis, num_questions=2)
    print(f"DEBUG: Questions generated: {len(questions)}")
    session.questions = questions
    
    if not questions:
         print("ERROR: No questions generated.")
         await sio.emit("status", {"state": "ERROR_NO_QUESTIONS"}, to=sid)
         return

    session.update_state(InterviewState.ASKING)
    await sio.emit("state_update", {"state": "ASKING", "data": session.questions[0]}, to=sid)
    print("DEBUG: Emitted ASKING state")
    
    # Trigger TTS
    await sio.emit("interviewer_speak", {"text": session.questions[0]['question_text']}, to=sid)

@sio.on("answer_audio")
async def handle_audio(sid, data):
    # Data is expected to be a dictionary with 'audio' (blob/bytes)
    # But dealing with raw binary over socket.io can be tricky.
    # Usually it's better to send as base64 or binary.
    # For this MVP, we will assume the client sends a blob or base64.
    
    # Implementing a mock STT and evaluation flow since full audio handling requires FFmpeg/Whisper setup 
    # which might be heavy for this environment.
    # We will assume 'data' contains text for now (Web Speech API fallback) OR raw audio.
    
    session = session_manager.sessions.get(sid)
    if not session:
        return

    user_text = ""
    # Check if client sent text directly (Web Speech API)
    if isinstance(data, dict) and "text" in data:
        user_text = data["text"]
        print(f"Received text input: {user_text}")
    else:
        # Placeholder for audio processing
        # filepath = audio_service.save_audio_chunk(data, sid)
        # user_text = audio_service.transcribe(filepath)
        user_text = "I am a strong candidate because I have experience with React and Python." # Mock

    # Analyze audio for emotion (if audio was provided)
    # audio_analysis = audio_service.analyze_audio(filepath)
    
    # 3. Evaluate Answer
    current_q = session.get_current_question()
    
    if not current_q:
        print("DEBUG: Received answer but no active question. Ignoring or finalizing.")
        if session.is_complete():
             # Just in case we missed the completion trigger
             await sio.emit("interview_complete", {"redirect": "/analysis", "report": {}}, to=sid)
        return

    evaluation = await ai_service.evaluate_response(
        question=current_q['question_text'] if current_q else "Unknown", 
        response_text=user_text, 
        difficulty=session.difficulty_level
    )
    
    # Update Session
    session.add_response({
        "question": current_q,
        "answer": user_text,
        "evaluation": evaluation
    })
    
    # Decide Next Step
    if session.is_complete():
        session.update_state(InterviewState.COMPLETE)
        await sio.emit("status", {"state": "COMPLETING"}, to=sid)
        
        # Generator Final Report
        report = await ai_service.generate_report(session)
        print(f"DEBUG: Report generated: {report}")
        
        # We need to store this report somewhere accessible by the frontend's analysis page.
        # Ideally, we pass it in the event, and frontend stores it in localStorage.
        await sio.emit("interview_complete", {"redirect": "/analysis", "report": report}, to=sid)
    else:
        # Move to next question
        # Adjust difficulty based on evaluation score (simple logic)
        score = evaluation.get("accuracy_score", 50)
        if score > 80:
             session.difficulty_level = "Hard"
        elif score < 40:
             session.difficulty_level = "Easy"
             
        session.update_state(InterviewState.ASKING)
        next_q = session.get_current_question()
        
        await sio.emit("state_update", {"state": "ASKING", "data": next_q}, to=sid)
        await sio.emit("interviewer_speak", {"text": next_q['question_text']}, to=sid)

if __name__ == "__main__":
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)
