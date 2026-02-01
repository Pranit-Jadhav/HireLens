import librosa
import numpy as np
import os
import uuid

class AudioService:
    def __init__(self, temp_dir="temp_audio"):
        self.temp_dir = temp_dir
        if not os.path.exists(self.temp_dir):
            os.makedirs(self.temp_dir)

    def save_audio_chunk(self, audio_data: bytes, session_id: str) -> str:
        filename = f"{session_id}_{uuid.uuid4()}.wav"
        filepath = os.path.join(self.temp_dir, filename)
        with open(filepath, "wb") as f:
            f.write(audio_data)
        return filepath

    def analyze_audio(self, filepath: str) -> dict:
        """
        Analyze audio for pitch, stability, etc.
        """
        try:
            y, sr = librosa.load(filepath)
            
            # Pitch tracking
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            # Select pitches with high magnitude
            pitch_values = pitches[magnitudes > np.median(magnitudes)]
            
            if len(pitch_values) == 0:
                return {"average_pitch": 0, "pitch_stability": 0}

            avg_pitch = np.mean(pitch_values)
            std_pitch = np.std(pitch_values)
            
            # Stability score: lower std dev -> higher stability. Normalize simplified.
            stability_score = max(0, 100 - std_pitch)

            return {
                "average_pitch": float(avg_pitch),
                "pitch_stability": float(stability_score)
            }
        except Exception as e:
            print(f"Error analyzing audio: {e}")
            return {"error": str(e)}
