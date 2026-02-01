'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import io, { Socket } from 'socket.io-client';
import MediaPipeTracker from '../../components/MediaPipeTracker';

// Basic type for fallback
interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  } & { length: number };
}

export default function InterviewPage() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('Connecting...');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Socket and Session
  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log("Speech recognition started");
            setStatus('Listening (Mic Active)...');
        };
        
        recognition.onend = () => {
            console.log("Speech recognition ended");
            // If we are still "recording" logically, we might want to restart?
            // For now, just log.
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            const currentText = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');
            
            console.log("Transcript updated:", currentText);
            setTranscript(currentText);
        };
        
        recognitionRef.current = recognition;
    }


    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setStatus('Connected');
      const resume = localStorage.getItem('interview_resume');
      const jd = localStorage.getItem('interview_jd');
      
      if (!resume || !jd) {
        alert('Missing Resume or JD');
        router.push('/');
        return;
      }
      
      newSocket.emit('start_session', { resume, jd });
    });

    newSocket.on('status', (data: { state: string }) => {
      setStatus(data.state);
    });

    newSocket.on('state_update', (data: { state: string, data: any }) => {
        if (data.state === 'ASKING') {
            setCurrentQuestion(data.data.question_text);
            setStatus('Interviewer is speaking...');
        }
    });

    newSocket.on('interviewer_speak', (data: { text: string }) => {
        const utterance = new SpeechSynthesisUtterance(data.text);
        utterance.rate = 1.1; 
        utterance.onend = () => {
            setStatus('Listening...');
            setIsRecording(true);
            setTranscript(''); // Ensure clean slate
            newSocket.emit('listening_started');
            
            if (recognitionRef.current) {
                // crucial: Ensure previous session is fully dead
                try {
                    recognitionRef.current.abort(); 
                } catch(e) { }
                
                // Small delay to allow browser to cleanup audio context
                setTimeout(() => {
                    try {
                        recognitionRef.current.start();
                    } catch(e) {
                        console.log("Recognition restart error:", e);
                    }
                }, 100);
            }
        };
        window.speechSynthesis.speak(utterance);
    });
    
    newSocket.on('interview_complete', (data: { redirect: string, report: any }) => {
        console.log("Interview Complete. Report:", data.report);
        if (data.report) {
            localStorage.setItem('interview_report', JSON.stringify(data.report));
        }
        router.push(data.redirect);
    });

    return () => {
      newSocket.disconnect();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [router]);
  
  const finalStop = () => {
      setIsRecording(false);
      setStatus('Thinking...');
      
      let textToSend = transcript;
      if (!textToSend && recognitionRef.current && (recognitionRef.current as any).finalTranscript) {
          textToSend = (recognitionRef.current as any).finalTranscript;
      }
      
      // Fallback
      if (!textToSend || textToSend.trim() === "") {
          textToSend = "I am ready for the next question."; 
      }

      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
      
      console.log("Sending Answer:", textToSend);
      setTranscript(''); // Clear UI immediately as requested
      
      if (socket) {
          socket.emit('answer_audio', { text: textToSend });
      }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col md:flex-row gap-4">
      {/* Left Panel: Camera & Visuals */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
          />
          <MediaPipeTracker 
            videoRef={webcamRef} 
            onConfidenceUpdate={(score, status) => {
                if (socket && isRecording) {
                    socket.emit('frame_analysis', { score, status });
                }
            }} 
          />
          
          {/* Status Overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <div className={`px-4 py-2 rounded-full backdrop-blur-md border ${
              status === 'Listening...' ? 'bg-red-500/20 border-red-500 text-red-400' : 
              status === 'Interviewer is speaking...' ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
              'bg-slate-800/50 border-slate-700 text-slate-300'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'Listening...' ? 'bg-red-500 animate-pulse' : 'bg-slate-400'
                }`} />
                <span className="font-mono text-sm font-bold uppercase tracking-wider">{status}</span>
              </div>
            </div>
            
            <div className="px-4 py-2 bg-slate-900/50 backdrop-blur-md rounded-full border border-slate-700">
              <span className="font-mono text-xs text-slate-400">SESSION ID: #8X29-ALPHA</span>
            </div>
          </div>
          
          {/* Audio Visualizer (Decor) */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center p-8">
             <div className="flex gap-1 items-end h-16">
                 {[...Array(20)].map((_, i) => (
                     <div key={i} 
                          className="w-2 bg-blue-500 rounded-full transition-all duration-75"
                          style={{ 
                              height: isRecording ? `${Math.random() * 100}%` : '10%',
                              opacity: isRecording ? 1 : 0.3 
                          }} 
                    />
                 ))}
             </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Conversation */}
      <div className="w-full md:w-[400px] flex flex-col gap-4">
        <div className="flex-1 bg-slate-900 rounded-2xl p-6 border border-slate-800 overflow-y-auto">
          <div className="space-y-6">
             {currentQuestion && (
                 <div className="animate-fade-in-right">
                     <p className="text-xs font-mono text-blue-400 mb-2">INTERVIEWER (AI)</p>
                     <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl rounded-tl-none mb-4">
                         <p className="text-lg font-light leading-relaxed">{currentQuestion}</p>
                     </div>
                 </div>
             )}
             
             {(isRecording || transcript) && (
                 <div className="animate-fade-in-left">
                    <p className="text-xs font-mono text-green-400 mb-2">YOU (Speech to Text)</p> 
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl rounded-tr-none">
                         <p className="text-md text-slate-300 italic">{transcript || "Listening..."}</p>
                    </div>
                 </div>
             )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
             <button
                 className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                     isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                 }`}
                 disabled={!isRecording}
                 onClick={finalStop}
             >
                 {isRecording ? 'Stop Recording (Answer)' : 'Waiting for Question...'}
             </button>
        </div>
      </div>
    </div>
  );
}
