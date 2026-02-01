'use client';

import { useEffect, useState } from 'react';

export default function AnalysisPage() {
  const [results, setResults] = useState<any>(null);

    useEffect(() => {
        const storedReport = localStorage.getItem('interview_report');
        if (storedReport) {
            try {
                const data = JSON.parse(storedReport);
                setResults(data);
            } catch (e) {
                console.error("Failed to parse report", e);
            }
        } else {
             // Fallback or redirect if no report found?
             // taking user back might be annoying if they refreshed.
             // Leaving null will show "Loading..." which is fine for now/
        }
    }, []);

    if (!results) return <div className="min-h-screen bg-black text-white flex items-center justify-center">No Analysis Found. Please complete an interview first.</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
          Interview Analysis
        </h1>

        <div className="grid md:grid-cols-3 gap-8">
            {/* Overall Score */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center flex flex-col justify-center items-center">
                <div className={`text-6xl font-black mb-2 ${
                    results.overall_score >= 80 ? 'text-green-500' : 
                    results.overall_score >= 50 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                    {results.overall_score}
                </div>
                <div className="text-sm text-slate-400 uppercase tracking-widest">Readiness Score</div>
                <div className="mt-4 px-4 py-1 rounded-full bg-slate-800 text-xs font-bold text-white uppercase">
                    {results.hiring_recommendation}
                </div>
            </div>

            {/* Feedback */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-4 text-blue-400">Executive Summary</h2>
                <p className="text-slate-300 leading-relaxed text-lg">
                    {results.final_feedback}
                </p>
            </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-6 text-green-400 flex items-center gap-2">
                    <span>💪</span> Key Strengths
                </h2>
                <ul className="space-y-3">
                    {results.strengths?.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                            <span className="text-slate-300">{item}</span>
                        </li>
                    )) || <li className="text-slate-500 italic">None identified</li>}
                </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-6 text-red-400 flex items-center gap-2">
                    <span>🎯</span> Areas for Improvement
                </h2>
                <ul className="space-y-3">
                    {results.weaknesses?.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="text-slate-300">{item}</span>
                        </li>
                    )) || <li className="text-slate-500 italic">None identified</li>}
                </ul>
            </div>
        </div>
        
        <div className="text-center pt-8">
            <a href="/" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all">
                Start New Interview
            </a>
        </div>
      </div>
    </div>
  );
}
