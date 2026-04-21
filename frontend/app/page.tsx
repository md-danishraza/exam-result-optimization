"use client";

import { useState, useEffect } from "react";

// Neominimalist UI Components
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white border-[3px] border-black rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full mx-auto transition-all">
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input
    className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg font-medium outline-none focus:border-black focus:ring-0 transition-colors"
    {...props}
  />
);

const Button = ({ children, isLoading, ...props }: any) => (
  <button
    className={`w-full bg-black text-white font-bold text-lg p-4 rounded-lg mt-6 hover:bg-gray-800 transition-colors ${
      isLoading ? "opacity-50 cursor-not-allowed" : ""
    }`}
    disabled={isLoading}
    {...props}
  >
    {isLoading ? "Processing..." : children}
  </button>
);

export default function Home() {
  const [rollNumber, setRollNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "queued" | "success" | "error">("idle");
  const [resultData, setResultData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Handle the automatic retry for the Virtual Waiting Room
  useEffect(() => {
    if (status === "queued" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status === "queued" && countdown === 0) {
      fetchResult(); // Automatically retry when countdown hits 0
    }
  }, [status, countdown]);

  const fetchResult = async () => {
    if (!rollNumber) return;
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}?roll=${rollNumber}`);
      const data = await response.json();

      if (response.status === 200) {
        setResultData(data);
        setStatus("success");
      } else if (response.status === 429) {
        // Trigger the Virtual Waiting Room
        setStatus("queued");
        setCountdown(data.retryAfter || 5);
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Result not found.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Network error. Please try again later.");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setResultData(null);
    setRollNumber("");
  };

  return (
    <main className="min-h-screen bg-rose-50 text-black font-sans flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            ExamPortal<span className="text-gray-400">.</span>
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Fast, secure, and reliable result checking.
          </p>
        </header>

        {/* 1. IDLE / SEARCH STATE */}
        {status === "idle" || status === "loading" || status === "error" ? (
          <Card>
            <h2 className="text-2xl font-bold mb-6">Check Results</h2>
            {status === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 font-medium">
                {errorMessage}
              </div>
            )}
            <div className="space-y-2">
              <label className="font-semibold text-gray-700 block">Enter Roll Number</label>
              <Input
                type="text"
                placeholder="e.g. 12345"
                value={rollNumber}
                onChange={(e: any) => setRollNumber(e.target.value)}
                onKeyDown={(e: any) => e.key === "Enter" && fetchResult()}
              />
            </div>
            <Button onClick={fetchResult} isLoading={status === "loading"}>
              View Marks
            </Button>
          </Card>
        ) : null}

        {/* 2. VIRTUAL WAITING ROOM (429 STATE) */}
        {status === "queued" && (
          <Card>
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-[4px] border-gray-200 border-t-black mb-6"></div>
              <h2 className="text-2xl font-bold mb-4">You are in line.</h2>
              <p className="text-gray-600 font-medium mb-6">
                Traffic is currently very high. To ensure system stability, you have been placed in a virtual waiting room.
              </p>
              <div className="bg-gray-100 rounded-lg p-4 inline-block">
                <span className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Retrying in
                </span>
                <span className="text-4xl font-extrabold">{countdown}s</span>
              </div>
            </div>
          </Card>
        )}

        {/* 3. SUCCESS / RESULT STATE */}
        {status === "success" && resultData && (
          <Card>
            <div className="border-b-2 border-gray-100 pb-6 mb-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">
                Student Name
              </h2>
              <p className="text-3xl font-extrabold">{resultData.student_name}</p>
              <p className="text-gray-500 font-medium mt-1">Roll No: {resultData.roll_number}</p>
            </div>

            <div className="space-y-4 mb-8">
              {Object.entries(resultData.marks).map(([subject, score]: any) => (
                <div key={subject} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <span className="font-bold text-gray-700 capitalize">{subject}</span>
                  <span className="font-extrabold text-xl">{score}</span>
                </div>
              ))}
            </div>

            <div className="bg-black text-white p-6 rounded-xl flex justify-between items-center">
              <span className="font-bold text-gray-400 uppercase tracking-wider">Total Score</span>
              <span className="text-4xl font-black">{resultData.total_score}</span>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-center font-bold text-gray-500 hover:text-black mt-8 transition-colors"
            >
              ← Check another result
            </button>
          </Card>
        )}
      </div>
    </main>
  );
}