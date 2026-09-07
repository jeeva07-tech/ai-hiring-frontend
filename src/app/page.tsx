"use client";

import { useEffect, useState } from "react";

interface Interview {
  id: number;
  call_id: string | null;
  status: string;
  lifecycle_status: string | null;
  engagement_status: string | null;
  answered_by: string | null;
  call_ended_by: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  result: Record<string, any> | null;
}

interface Candidate {
  id: number;
  name: string;
  title?: string;
  location?: string;
  skills?: string[];
  experience?: number;
  email?: string;
  mobile_number?: string;
  job_id: number;
  job_title?: string;
  resume_text?: string;
  match_score?: number;
  matched_keywords?: string[];
  interviews?: Interview[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const HUNAR_AGENT_ID =
  "24b51eac-cfbf-4b5e-a644-eefb58f17355";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<
    Record<number, string>
  >({});

  const [jobId, setJobId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [callingCandidateId, setCallingCandidateId] =
    useState<number | null>(null);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // SEARCH CANDIDATES
  // --------------------------------------------------

  const searchCandidates = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/candidates/search/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to search candidates."
        );
      }

      console.log("Search response:", data);

      // IMPORTANT:
      // Save the Job ID returned by Django.
      setJobId(data.job_id);

      setCandidates(data.candidates || []);

      // Pre-fill phone numbers returned by the search API.
      const numbers: Record<number, string> = {};

      (data.candidates || []).forEach(
        (candidate: Candidate) => {
          if (candidate.mobile_number) {
            numbers[candidate.id] =
              candidate.mobile_number;
          }
        }
      );

      setPhoneNumbers(numbers);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD CANDIDATES
  // --------------------------------------------------

  const loadCandidates = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/candidates/list/`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load candidates."
        );
      }

      setCandidates(data.candidates || []);

      const numbers: Record<number, string> = {};

      (data.candidates || []).forEach(
        (candidate: Candidate) => {
          if (candidate.mobile_number) {
            numbers[candidate.id] =
              candidate.mobile_number;
          }
        }
      );

      setPhoneNumbers(numbers);
    } catch (err) {
      console.error("Load candidates error:", err);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadCandidates();
  }, []);

  // --------------------------------------------------
  // CALL CANDIDATE
  // --------------------------------------------------

  const callCandidate = async (
    candidate: Candidate
  ) => {
    try {
      setCallingCandidateId(candidate.id);
      setError("");

      // IMPORTANT:
      // A job must exist before creating the Hunar call.
      const callJobId = candidate.job_id || jobId;

      if (!callJobId) {
        throw new Error(
        "No job ID found for this candidate."
      );
}

      const phone =
        phoneNumbers[candidate.id];

      if (!phone) {
        throw new Error(
          "Please enter a phone number."
        );
      }

      if (!phone.startsWith("+")) {
        throw new Error(
          "Phone number must include country code, e.g. +919876543210"
        );
      }

      console.log("Starting Hunar call...");
      console.log("Job ID:", jobId);
      console.log("Candidate:", candidate.name);
      console.log("Phone:", phone);

      const response = await fetch(
        `${API_URL}/api/voice/calls/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // FIX:
            // Send the job ID returned by search.
            job_id: callJobId,

            agent_id: HUNAR_AGENT_ID,

            callee_name: candidate.name,

            mobile_number: phone,

            custom_data: {
              role_title:
                candidate.job_title ||
                candidate.title ||
                "Software Developer",
            },
          }),
        }
      );

      const data = await response.json();

      console.log("Hunar call response:", data);

      if (!response.ok) {
        throw new Error(
          JSON.stringify(data)
        );
      }

      alert(
        "Voice call started successfully!"
      );

      /*
       * Give Hunar some time to process the call
       * and send webhook updates.
       */
      setTimeout(() => {
        loadCandidates();
      }, 5000);
    } catch (err) {
      console.error(
        "Hunar call error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to start voice call."
      );
    } finally {
      setCallingCandidateId(null);
    }
  };

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const updatePhoneNumber = (
    candidateId: number,
    value: string
  ) => {
    setPhoneNumbers((previous) => ({
      ...previous,
      [candidateId]: value,
    }));
  };

  const getLatestInterview = (
    candidate: Candidate
  ) => {
    if (
      !candidate.interviews ||
      candidate.interviews.length === 0
    ) {
      return null;
    }

    return candidate.interviews[
      candidate.interviews.length - 1
    ];
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}

      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-3xl font-bold">
            AI Hiring Assistant
          </h1>

          <p className="mt-2 text-slate-400">
            AI-powered candidate search and voice
            recruitment
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
            <p className="font-semibold">
              Error
            </p>

            <p className="mt-1 break-all text-sm">
              {error}
            </p>
          </div>
        )}

        {/* JOB DESCRIPTION */}

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              1. Job Description
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Enter the job description to find
              suitable candidates.
            </p>
          </div>

          <textarea
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(event.target.value)
            }
            placeholder="Example: We are looking for a Python Developer with Django, REST APIs, PostgreSQL and AI/ML experience..."
            className="min-h-40 w-full rounded-lg border border-slate-700 bg-slate-950 p-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={searchCandidates}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Searching..."
                : "Search Candidates"}
            </button>

            {jobId && (
              <span className="text-sm text-slate-400">
                Job ID:{" "}
                <span className="font-semibold text-white">
                  {jobId}
                </span>
              </span>
            )}
          </div>
        </section>

        {/* CANDIDATES */}

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                2. Candidate Results
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {candidates.length} candidate
                {candidates.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>
            </div>

            <button
              onClick={loadCandidates}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
              <p className="text-slate-400">
                No candidates found yet.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Enter a job description and click
                Search Candidates.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {candidates.map(
                (candidate) => {
                  const interview =
                    getLatestInterview(
                      candidate
                    );

                  return (
                    <div
                      key={candidate.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg"
                    >
                      {/* CANDIDATE HEADER */}

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold">
                            {candidate.name}
                          </h3>

                          <p className="mt-1 text-blue-400">
                            {candidate.title ||
                              candidate.job_title ||
                              "Software Developer"}
                          </p>

                          {candidate.location && (
                            <p className="mt-1 text-sm text-slate-400">
                              📍{" "}
                              {candidate.location}
                            </p>
                          )}
                        </div>

                        {candidate.match_score !==
                          undefined && (
                          <div className="rounded-lg bg-blue-950 px-3 py-2 text-center">
                            <p className="text-xs text-slate-400">
                              Match
                            </p>

                            <p className="text-lg font-bold text-blue-400">
                              {
                                candidate.match_score
                              }
                              %
                            </p>
                          </div>
                        )}
                      </div>

                      {/* SKILLS */}

                      {candidate.skills &&
                        candidate.skills.length >
                          0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-sm font-semibold text-slate-300">
                              Skills
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {candidate.skills.map(
                                (
                                  skill
                                ) => (
                                  <span
                                    key={
                                      skill
                                    }
                                    className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
                                  >
                                    {
                                      skill
                                    }
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* EXPERIENCE */}

                      {candidate.experience !==
                        undefined && (
                        <p className="mt-4 text-sm text-slate-400">
                          Experience:{" "}
                          <span className="text-white">
                            {
                              candidate.experience
                            }{" "}
                            years
                          </span>
                        </p>
                      )}

                      {/* EMAIL */}

                      {candidate.email && (
                        <p className="mt-2 text-sm text-slate-400">
                          Email:{" "}
                          <span className="text-slate-200">
                            {candidate.email}
                          </span>
                        </p>
                      )}

                      {/* VOICE OUTREACH */}

                      <div className="mt-6 border-t border-slate-800 pt-5">
                        <h4 className="font-semibold">
                          🎙️ Voice AI Outreach
                        </h4>

                        <p className="mt-1 text-xs text-slate-500">
                          Enter an authorized phone
                          number to test the Hunar
                          voice agent.
                        </p>

                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={
                              phoneNumbers[
                                candidate.id
                              ] || ""
                            }
                            onChange={(event) =>
                              updatePhoneNumber(
                                candidate.id,
                                event.target
                                  .value
                              )
                            }
                            placeholder="+919876543210"
                            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />

                          <button
                            onClick={() =>
                              callCandidate(
                                candidate
                              )
                            }
                            disabled={
                              callingCandidateId ===
                              candidate.id
                            }
                            className="rounded-lg bg-green-600 px-5 py-3 font-semibold transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {callingCandidateId ===
                            candidate.id
                              ? "Calling..."
                              : "📞 Call"}
                          </button>
                        </div>
                      </div>

                      {/* INTERVIEW RESULT */}

                      {interview && (
                        <div className="mt-6 border-t border-slate-800 pt-5">
                          <h4 className="font-semibold">
                            📊 Interview Result
                          </h4>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg bg-slate-950 p-3">
                              <p className="text-xs text-slate-500">
                                Status
                              </p>

                              <p className="mt-1 font-semibold">
                                {
                                  interview.status
                                }
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-950 p-3">
                              <p className="text-xs text-slate-500">
                                Lifecycle
                              </p>

                              <p className="mt-1 font-semibold">
                                {interview.lifecycle_status ||
                                  "-"}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-950 p-3">
                              <p className="text-xs text-slate-500">
                                Engagement
                              </p>

                              <p className="mt-1 font-semibold">
                                {interview.engagement_status ||
                                  "-"}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-950 p-3">
                              <p className="text-xs text-slate-500">
                                Answered By
                              </p>

                              <p className="mt-1 font-semibold">
                                {interview.answered_by ||
                                  "-"}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-950 p-3">
                              <p className="text-xs text-slate-500">
                                Ended By
                              </p>

                              <p className="mt-1 font-semibold">
                                {interview.call_ended_by ||
                                  "-"}
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-950 p-3">
                              <p className="text-xs text-slate-500">
                                Duration
                              </p>

                              <p className="mt-1 font-semibold">
                                {interview.duration_seconds
                                  ? `${Math.round(
                                      interview.duration_seconds
                                    )} sec`
                                  : "-"}
                              </p>
                            </div>
                          </div>

                          {/* CALL ID */}

                          {interview.call_id && (
                            <div className="mt-4 rounded-lg bg-slate-950 p-3">
                              <p className="text-xs text-slate-500">
                                Call ID
                              </p>

                              <p className="mt-1 break-all text-xs text-slate-300">
                                {
                                  interview.call_id
                                }
                              </p>
                            </div>
                          )}

                          {/* AI ANSWERS */}

                          {interview.result &&
                            Object.keys(
                              interview.result
                            ).length > 0 && (
                              <div className="mt-4">
                                <p className="mb-3 font-semibold">
                                  🤖 AI Answers
                                </p>

                                <div className="space-y-2">
                                  {Object.entries(
                                    interview.result
                                  ).map(
                                    ([
                                      key,
                                      value,
                                    ]) => (
                                      <div
                                        key={
                                          key
                                        }
                                        className="rounded-lg bg-slate-950 p-3"
                                      >
                                        <p className="text-xs capitalize text-slate-500">
                                          {key.replace(
                                            /_/g,
                                            " "
                                          )}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-200">
                                          {typeof value ===
                                          "object"
                                            ? JSON.stringify(
                                                value
                                              )
                                            : String(
                                                value
                                              )}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* RECORDING */}

                          {interview.recording_url && (
                            <div className="mt-4">
                              <a
                                href={
                                  interview.recording_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-slate-800"
                              >
                                🎧 Listen to Recording
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* PART 3 - ATTENDANCE SYSTEM */}

<section className="mt-10">
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">

    <div className="mb-6">
      <div className="inline-flex rounded-full bg-purple-950 px-3 py-1 text-xs font-semibold text-purple-400">
        PART 3
      </div>

      <h2 className="mt-3 text-2xl font-bold">
        📍 AI Attendance Management
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        Attendance tracking solution for 1,000 employees
        across 100 locations without requiring smartphones.
        Physical attendance terminals collect reliable
        attendance events while an LLM analyzes the data
        and generates HR insights.
      </p>
    </div>

    {/* ARCHITECTURE */}

    <div className="grid gap-4 md:grid-cols-5">

      <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="text-2xl">👤</div>

        <h3 className="mt-3 font-semibold">
          Employee
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          Employee identifies themselves using an
          employee ID, RFID card or secure PIN.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="text-2xl">🏢</div>

        <h3 className="mt-3 font-semibold">
          Location Kiosk
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          Each of the 100 locations has an attendance
          terminal connected to the internet.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="text-2xl">🗄️</div>

        <h3 className="mt-3 font-semibold">
          Attendance API
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          Django REST API validates the employee,
          location and timestamp before storing the event.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="text-2xl">📊</div>

        <h3 className="mt-3 font-semibold">
          HR Dashboard
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          HR can view attendance across all 100 locations
          from one centralized dashboard.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="text-2xl">🤖</div>

        <h3 className="mt-3 font-semibold">
          LLM Analysis
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          LLM analyzes attendance patterns and produces
          daily summaries and exception reports.
        </p>
      </div>

    </div>

    {/* DAILY PROCESS */}

    <div className="mt-8">
      <h3 className="text-lg font-semibold">
        Daily Workflow
      </h3>

      <div className="mt-4 space-y-3">

        <div className="flex items-start gap-4 rounded-lg bg-slate-950 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-950 text-sm font-bold text-blue-400">
            1
          </span>

          <div>
            <p className="font-semibold">
              Employee Check-in
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Employee uses the attendance terminal at
              their assigned location.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg bg-slate-950 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-950 text-sm font-bold text-blue-400">
            2
          </span>

          <div>
            <p className="font-semibold">
              Validation
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Backend validates employee ID, assigned
              location and timestamp.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg bg-slate-950 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-950 text-sm font-bold text-blue-400">
            3
          </span>

          <div>
            <p className="font-semibold">
              Store Attendance
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Attendance event is stored centrally in
              PostgreSQL.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg bg-slate-950 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-950 text-sm font-bold text-purple-400">
            4
          </span>

          <div>
            <p className="font-semibold">
              LLM Analysis
            </p>

            <p className="mt-1 text-sm text-slate-400">
              At the end of the day, attendance data is
              summarized and analyzed by an LLM.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg bg-slate-950 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-950 text-sm font-bold text-green-400">
            5
          </span>

          <div>
            <p className="font-semibold">
              HR Gets Insights
            </p>

            <p className="mt-1 text-sm text-slate-400">
              HR receives a concise report containing
              attendance statistics, anomalies and
              locations requiring attention.
            </p>
          </div>
        </div>

      </div>
    </div>

    {/* SAMPLE AI REPORT */}

    <div className="mt-8 rounded-xl border border-purple-900 bg-purple-950/20 p-5">

      <div className="flex items-center gap-2">
        <span className="text-xl">🤖</span>

        <h3 className="font-semibold text-purple-300">
          Example LLM Daily Report
        </h3>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-300">

        <p>
          <span className="font-semibold text-white">
            Overall attendance:
          </span>{" "}
          94.2%
        </p>

        <p>
          <span className="font-semibold text-white">
            Late arrivals:
          </span>{" "}
          37 employees
        </p>

        <p>
          <span className="font-semibold text-white">
            Missing checkout:
          </span>{" "}
          12 employees
        </p>

        <p>
          <span className="font-semibold text-white">
            Locations requiring attention:
          </span>{" "}
          3 locations
        </p>

        <p className="pt-2 text-purple-300">
          "Location 17 shows an unusually high number of
          late arrivals compared with its recent attendance
          pattern. HR may want to review the reason."
        </p>

      </div>
    </div>

    {/* DESIGN PRINCIPLES */}

    <div className="mt-8 grid gap-4 md:grid-cols-3">

      <div className="rounded-lg border border-slate-800 p-4">
        <h4 className="font-semibold">
          🔐 Reliable Source of Truth
        </h4>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          Attendance events come directly from physical
          terminals and are stored in PostgreSQL.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 p-4">
        <h4 className="font-semibold">
          🤖 LLM as an Analyst
        </h4>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          The LLM analyzes verified attendance data instead
          of directly deciding whether someone is present.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 p-4">
        <h4 className="font-semibold">
          📈 Scalable
        </h4>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          The same API and database architecture can
          support 1,000 employees and 100 locations.
        </p>
      </div>

    </div>

  </div>
</section>

        {/* FOOTER */}

        <footer className="mt-10 border-t border-slate-800 py-6 text-center text-sm text-slate-500">
          AI Hiring Assistant • Next.js +
          Django REST Framework + Hunar AI
        </footer>
      </div>
    </main>
  );
}