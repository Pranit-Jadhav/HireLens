from enum import Enum
from typing import List, Dict, Optional
import uuid

class InterviewState(Enum):
    SETUP = "SETUP"
    ASKING = "ASKING"
    LISTENING = "LISTENING"
    DECIDING = "DECIDING"
    COMPLETE = "COMPLETE"

class InterviewSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.state = InterviewState.SETUP
        self.resume_text: str = ""
        self.job_description: str = ""
        self.questions: List[Dict] = []
        self.current_question_index = 0
        self.responses: List[Dict] = [] # Stores audio paths, transcripts, scores
        self.total_score = 0
        self.difficulty_level = "Medium" # Start at Medium

    def update_state(self, new_state: InterviewState):
        self.state = new_state
        print(f"Session {self.session_id} moved to {self.state}")

    def add_response(self, response_data: Dict):
        self.responses.append(response_data)
        # Placeholder for scoring logic update
        self.current_question_index += 1

    def get_current_question(self) -> Optional[Dict]:
        if 0 <= self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None

    def is_complete(self) -> bool:
        return self.current_question_index >= len(self.questions)

# Simple in-memory storage for sessions
class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, InterviewSession] = {}

    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = InterviewSession(session_id)
        return session_id

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
