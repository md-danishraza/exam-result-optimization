import React from 'react';

// Reusable Neominimalist Section Component
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <section className="bg-white border-[3px] border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
    <h2 className="text-2xl font-black mb-4 uppercase tracking-tight border-b-2 border-gray-100 pb-2">{title}</h2>
    <div className="text-gray-700 leading-relaxed font-medium space-y-4">
      {children}
    </div>
  </section>
);

export default function About() {
  return (
    <main className="min-h-screen font-sans py-12 px-6">
      <div className="max-w-4xl mx-auto">
        
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-black">
            System Architecture
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Solving the "Thundering Herd" Problem in Examination Portals
          </p>
        </header>

        <Section title="The Problem: Monolithic Bottlenecks">
          <p>
            During national or university-level examination result declarations, portals experience a sudden, massive influx of traffic known as the <strong>"Thundering Herd"</strong> phenomenon.
          </p>
          <p>
            Traditional monolithic architectures rely on direct relational database (SQL) queries for every user request. When millions of students request their results simultaneously, the database locks up due to connection exhaustion, leading to server timeouts, 5xx errors, and complete system crashes.
          </p>
        </Section>

        <Section title="The Solution: CQRS & Edge Caching">
          <p>
            This project implements the <strong>Command Query Responsibility Segregation (CQRS)</strong> pattern to decouple the write operations from the read operations.
          </p>
          <ul className="list-disc list-inside space-y-2 mt-4 font-semibold text-black">
            <li><span className="text-gray-600">Command Path (Write):</span> An isolated admin service securely processes CSV uploads, saving the master record to PostgreSQL and pushing a pre-computed JSON string to a Redis cluster.</li>
            <li><span className="text-gray-600">Query Path (Read):</span> Public traffic is routed through a rate-limiting API Gateway. This service strictly bypasses the SQL database, performing O(1) lookups directly against Upstash Redis.</li>
          </ul>
        </Section>

        <Section title="Virtual Waiting Room (Rate Limiting)">
          <p>
            To further protect the infrastructure, the API Gateway implements a Token Bucket rate-limiting algorithm. If traffic exceeds safe operational thresholds (e.g., 100 requests per second), excess traffic is intercepted and served an HTTP 429 status.
          </p>
          <p>
            The Next.js frontend intercepts this status and seamlessly transitions the user into a <strong>Virtual Waiting Room</strong>, preventing connection drops and ensuring a graceful user experience during peak loads.
          </p>
        </Section>

        <Section title="Technology Stack">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Next.js (UI)</div>
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Node.js (API)</div>
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Supabase (DB)</div>
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Upstash (Redis)</div>
          </div>
        </Section>

      </div>
    </main>
  );
}
