import os
import google.generativeai as genai
import json
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("CRITICAL: GEMINI_API_KEY not found in environment variables.")
else:
    genai.configure(api_key=API_KEY)

import asyncio
import random

class AIService:
    def __init__(self):
        # Switching to gemini-flash-latest (Stable 1.5 Flash) to avoid 2.0-flash rate limits
        self.model = genai.GenerativeModel('models/gemini-flash-latest') 

    async def _retry_operation(self, func, *args, retries=3, **kwargs):
        """Helper to retry operations on 429 Too Many Requests"""
        last_exception = None
        for i in range(retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    wait_time = (2 ** i) + random.uniform(0, 1)
                    print(f"WARNING: Rate limit hit. Retrying in {wait_time:.2f}s... (Attempt {i+1}/{retries})")
                    await asyncio.sleep(wait_time)
                else:
                    raise e # Don't retry on other errors
        raise last_exception

    async def parse_resume_and_jd(self, resume_text: str, jd_text: str) -> Dict:
        prompt = f"""
        Analyze the following Resume and Job Description.
        Extract a 'Skill Matrix' and identify key areas to probe.
        
        Resume:
        {resume_text}
        
        Job Description:
        {jd_text}
        
        Return a JSON object with this schema:
        {{
            "candidate_name": "str",
            "matching_skills": ["str"],
            "missing_skills": ["str"],
            "suggested_focus_areas": ["str"]
        }}
        """
        try:
            # Wrap the generation call in the retry helper
            response = await self._retry_operation(
                self.model.generate_content_async,
                prompt, 
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"ERROR: Gemini Parsing Failed: {e}")
            return {}

    async def generate_questions(self, context: Dict, num_questions: int = 5) -> List[Dict]:
        prompt = f"""
        Generate {num_questions} BEGINNER-FRIENDLY interview questions based on the skill matrix below.
        The goal is to BUILD CONFIDENCE in the candidate.
        Start with very simple concepts and "warm-up" questions.
        Avoid complex system design or deep architectural questions.
        
        Context:
        {json.dumps(context)}
        
        The questions should be mostly Easy complexity.
        Return a JSON ARRAY of objects with this schema:
        [
            {{
                "question_text": "str",
                "difficulty": "str",
                "expected_key_points": ["str"]
            }}
        ]
        """
        try:
            response = await self._retry_operation(
                self.model.generate_content_async,
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Error generating questions: {e}")
            return []

    async def evaluate_response(self, question: str, response_text: str, difficulty: str) -> Dict:
        prompt = f"""
        Evaluate the candidate's answer to the interview question.
        
        Question ({difficulty}): {question}
        Candidate Answer: "{response_text}"
        
        Evaluation Criteria:
        1. Be encouraging and supportive.
        2. Focus on what they got right, even if it's basic.
        3. If they missed something, suggest it gently as a learning tip.
        
        Return a JSON object with this schema:
        {{
            "accuracy_score": int,
            "clarity_score": int,
            "depth_score": int,
            "feedback": "Supportive feedback to help them improve.",
            "sentiment": "Positive/Neutral/Negative"
        }}
        """
        try:
            response = await self._retry_operation(
                self.model.generate_content_async,
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Error evaluating response: {e}")
            return {"accuracy_score": 0, "clarity_score": 0, "depth_score": 0, "feedback": "Error evaluating"}

    async def generate_report(self, session_data: object) -> Dict:
        # Convert session object to a simple dict for the prompt
        history = []
        # Fix: The attribute in InterviewSession is 'responses', not 'history'
        for r in session_data.responses: 
            q_text = r['question']['question_text'] if r.get('question') else "Unknown Question"
            history.append({
                "question": q_text,
                "answer": r['answer'],
                "score": r['evaluation']['accuracy_score']
            })
            
        prompt = f"""
        Generate a Final Interview Report based on this session history:
        {json.dumps(history)}
        
        The candidate was being interviewed for a role.
        
        Return a JSON object with this schema:
        {{
            "overall_score": int,
            "strengths": ["str"],
            "weaknesses": ["str"],
            "final_feedback": "Detailed encouraging feedback summary",
            "hiring_recommendation": "Strong Hire/Hire/No Hire"
        }}
        """
        try:
            response = await self._retry_operation(
                self.model.generate_content_async,
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Error generating report: {e}")
            return {
                "overall_score": 0,
                "strengths": ["N/A"],
                "weaknesses": ["N/A"],
                "final_feedback": "Could not generate report due to error.",
                "hiring_recommendation": "N/A"
            }
