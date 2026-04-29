"use client";

import { useState, useEffect, useRef } from "react";

// Helper to dynamically load external scripts to avoid build errors in the Canvas
const loadScript = (src: string) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Neominimalist UI Components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border-[3px] border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full mx-auto transition-all ${className}`}>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input
    className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg font-medium outline-none focus:border-black focus:ring-0 transition-colors"
    {...props}
  />
);

const Button = ({ children, isLoading, variant = "primary", ...props }: any) => {
  const baseStyle = "w-full font-bold text-lg p-4 rounded-lg mt-6 transition-colors flex items-center justify-center ";
  const variants: any = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-white text-black border-[3px] border-black hover:bg-gray-100",
  };
  
  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-t-2 border-current border-solid rounded-full animate-spin"></div>
          <span>Processing...</span>
        </div>
      ) : children}
    </button>
  );
};

export default function Home() {
  const [rollNumber, setRollNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "queued" | "success" | "error">("idle");
  const [resultData, setResultData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  
  // Use a ref to ensure the ping only happens once per session
  const hasPinged = useRef(false);

  // WAKE UP HOOK FOR RENDER FREE TIER
  useEffect(() => {
    if (hasPinged.current) return;
    
    const wakeUpServers = async () => {
      setIsWakingUp(true);
      hasPinged.current = true;
      
      try {
        // We ping a dummy roll number ("ping") to wake up both the Auth Service 
        // AND the Query Service, forcing both containers to spin up immediately.
        console.log("Pinging Render servers to wake from sleep mode...");
        
        // We don't await this because we don't want to block the UI from rendering.
        // We just fire the request into the void to start the container boot sequence.
        fetch(`${process.env.NEXT_PUBLIC_API_URL}?roll=ping`, { 
          method: 'GET',
          // Small timeout so it doesn't hang forever if the user leaves
          signal: AbortSignal.timeout(5000) 
        }).catch(() => {
          // We expect this to fail or timeout if it's cold starting, 
          // but the request itself triggers the boot!
        });
        fetch(`${process.env.NEXT_PUBLIC_QUERY}?roll=ping`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) 
        }).catch(() => {
        });
        
      } catch (e) {
        console.log("Ping initiated.");
      }
      
      // We show the "Waking up server" badge for exactly 3 seconds, 
      // which is usually how long it takes a user to read the page and click the input box.
      setTimeout(() => setIsWakingUp(false), 3000);
    };

    wakeUpServers();
  }, []);

  // Handle the automatic retry for the Virtual Waiting Room
  useEffect(() => {
    if (status === "queued" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status === "queued" && countdown === 0) {
      fetchResult();
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
        setStatus("queued");
        setCountdown(data.retryAfter || 5);
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Result not found.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Network error. This usually means the server is waking up from sleep mode (takes ~30s). Please try again in a moment.");
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    const element = document.getElementById("result-certificate");
    
    if (element) {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

        // @ts-ignore
        const toPng = window.htmlToImage?.toPng || window.htmlToImage;
        
        const dataUrl = await toPng(element, { 
          quality: 1.0,
          pixelRatio: 2, 
          backgroundColor: "#ffffff"
        });
        
        // @ts-ignore
        const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
        
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Result_${resultData.roll_number}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF", err);
        alert("Failed to generate PDF. Please try again.");
      }
    }
    setIsDownloading(false);
  };

  const handleReset = () => {
    setStatus("idle");
    setResultData(null);
    setRollNumber("");
  };

  return (
    <main className="py-12 px-6 flex flex-col items-center justify-center relative">
      
      {/* "Waking Up" Notification Badge */}
      {isWakingUp && (
        <div className="absolute top-4 right-4 bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg font-bold text-sm shadow-[4px_4px_0px_0px_rgba(250,204,21,0.5)] animate-pulse flex items-center space-x-2 z-50">
           <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
           <span>Booting Edge Servers...</span>
        </div>
      )}

      <div className="w-full max-w-4xl">
        
        {/* Only show header on the search screen */}
        {status !== "success" && (
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-black">
              ExamPortal<span className="text-gray-400">.</span>
            </h1>
            <p className="text-gray-600 text-lg font-medium">
              Fast, secure, and reliable result checking.
            </p>
          </header>
        )}

        {/* 1. IDLE / SEARCH STATE */}
        {status === "idle" || status === "loading" || status === "error" ? (
          <Card>
            <h2 className="text-2xl font-bold mb-6 text-black">Check Results</h2>
            {status === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 font-medium text-sm leading-relaxed">
                {errorMessage}
              </div>
            )}
            <div className="space-y-2">
              <label className="font-semibold text-gray-700 block">Enter Roll Number</label>
              <Input
                type="text"
                placeholder="e.g. 10001-10100"
                value={rollNumber}
                onChange={(e: any) => setRollNumber(e.target.value)}
                onKeyDown={(e: any) => e.key === "Enter" && fetchResult()}
              />
            </div>
            <Button onClick={fetchResult} isLoading={status === "loading"}>
              View Mark Sheet
            </Button>
          </Card>
        ) : null}

        {/* 2. VIRTUAL WAITING ROOM (429 STATE) */}
        {status === "queued" && (
          <Card>
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-[4px] border-gray-200 border-t-black mb-6"></div>
              <h2 className="text-2xl font-bold mb-4 text-black">You are in line.</h2>
              <p className="text-gray-600 font-medium mb-6">
                Traffic is currently very high. To ensure system stability, you have been placed in a virtual waiting room.
              </p>
              <div className="bg-gray-100 rounded-lg p-4 inline-block border-2 border-gray-200">
                <span className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Retrying in
                </span>
                <span className="text-4xl font-extrabold text-black">{countdown}s</span>
              </div>
            </div>
          </Card>
        )}

        {/* 3. SUCCESS / RESULT STATE (THE PRINTABLE MARK SHEET) */}
        {status === "success" && resultData && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* The actual element that gets converted to PDF */}
            <div 
              id="result-certificate" 
              className="bg-white border-[4px] border-black p-8 md:p-12 relative shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-black"
            >
              {/* Certificate Header */}
              <div className="text-center border-b-[4px] border-black pb-6 mb-8">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
                  {resultData.school_name}
                </h1>
                <h2 className="text-xl font-bold tracking-widest text-gray-600 uppercase">
                  Statement of Marks
                </h2>
                <p className="text-sm font-semibold text-gray-400 mt-2">
                  ACADEMIC SESSION 2023-2024
                </p>
              </div>

              {/* Demographics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 font-medium">
                <div className="space-y-2">
                  <p><span className="text-gray-500 uppercase text-sm font-bold tracking-wider block">Student Name</span> <span className="text-xl font-black">{resultData.student_name}</span></p>
                  <p><span className="text-gray-500 uppercase text-sm font-bold tracking-wider block">Father's Name</span> <span className="text-lg font-bold">{resultData.father_name}</span></p>
                </div>
                <div className="space-y-2 md:text-right">
                  <p><span className="text-gray-500 uppercase text-sm font-bold tracking-wider block">Roll Number</span> <span className="text-xl font-black">{resultData.roll_number}</span></p>
                  <p><span className="text-gray-500 uppercase text-sm font-bold tracking-wider block">Date of Birth</span> <span className="text-lg font-bold">{resultData.dob}</span></p>
                </div>
              </div>

              {/* Marks Table */}
              <div className="border-[3px] border-black rounded-lg overflow-hidden mb-8">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-black text-white uppercase text-sm tracking-wider">
                      <th className="p-4 font-bold border-r border-gray-700">Subject</th>
                      <th className="p-4 font-bold text-center border-r border-gray-700">Marks Obtained</th>
                      <th className="p-4 font-bold text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resultData.marks).map(([subject, details]: any, index) => (
                      <tr key={subject} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-4 font-bold capitalize border-r-[3px] border-black">{subject}</td>
                        <td className="p-4 text-center font-black text-xl border-r-[3px] border-black">{details.score}</td>
                        <td className="p-4 text-center font-black text-xl text-gray-600">{details.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer / Grand Total */}
              <div className="flex flex-col md:flex-row justify-between items-center bg-gray-100 border-[3px] border-black p-6 rounded-lg relative overflow-hidden">
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Grand Total</p>
                  <p className="text-4xl font-black">{resultData.total_score}</p>
                </div>
                
                {/* Stamp Effect */}
                <div className="mt-4 md:mt-0">
                   <div className={`border-[4px] px-6 py-2 transform -rotate-6 font-black text-3xl tracking-widest uppercase ${
                      resultData.status?.toUpperCase() === 'PASS' 
                        ? 'border-green-600 text-green-600' 
                        : 'border-red-600 text-red-600'
                    }`}>
                      {resultData.status}
                   </div>
                </div>
              </div>

              <div className="mt-8 text-center text-xs font-bold text-gray-400">
                <p>This is a computer-generated document. No signature is required.</p>
                <p>Generated via ExamPortal Edge Architecture.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4 mt-8">
              <Button onClick={handleDownloadPdf} isLoading={isDownloading} variant="primary">
                Download PDF
              </Button>
              <Button onClick={handleReset} variant="secondary">
                Search Another Roll Number
              </Button>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}