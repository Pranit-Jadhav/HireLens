'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const router = useRouter();

  const handleStart = () => {
    if (!resume || !jd) {
      alert('Please provide both Resume and Job Description');
      return;
    }
    // Store in localStorage for simplicity to pass to the interview page
    localStorage.setItem('interview_resume', resume);
    localStorage.setItem('interview_jd', jd);
    router.push('/interview');
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#1a1c2e] to-black">
      <div className="max-w-4xl w-full space-y-8 animate-fade-in-up">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight">
            AI Interviewer
          </h1>
          <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
            Experience a realistic, high-stakes technical interview with our multimodal AI. 
            Receive real-time feedback on your answers, vocal confidence, and body language.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Resume Section */}
          <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-2xl hover:border-blue-500/50 transition-colors">
            <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center gap-2">
              1. Your Resume
            </h2>
            <textarea
              className="w-full h-64 bg-slate-900/50 rounded-lg p-4 text-slate-300 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none border border-slate-700"
              placeholder="Paste your resume text here (experience, skills, projects)..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
          </div>

          {/* JD Section */}
          <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700 shadow-2xl hover:border-pink-500/50 transition-colors">
            <h2 className="text-2xl font-bold mb-4 text-pink-400 flex items-center gap-2">
              2. Job Description
            </h2>
            <textarea
              className="w-full h-64 bg-slate-900/50 rounded-lg p-4 text-slate-300 resize-none focus:ring-2 focus:ring-pink-500 focus:outline-none border border-slate-700"
              placeholder="Paste the Job Description here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <button
            onClick={handleStart}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 flex items-center gap-2">
              Start Mock Interview
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
