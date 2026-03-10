import React, { useEffect, useRef, useState } from "react";
import { Plus, Mic, FileText, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UploadNotes from "../components/UploadNotes";
import studyMinutesLogo from "../assets/studyminutes_logo.png";

const cleanMarkdown = (text) => (text || "").replace(/\*\*/g, "").trim();

const extractSubject = (noteText) => {
  const safe = cleanMarkdown(noteText);
  const match = safe.match(/Subject:\s*([^\n]+)/i);
  return match ? match[1].trim() : "";
};

const RECENT_UPLOADS_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

const toIstDateKey = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const toIstWeekdayLabel = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [importantTopicsCount, setImportantTopicsCount] = useState(0);
  const [recentUploadsCount, setRecentUploadsCount] = useState(0);
  const [weeklyUploadData, setWeeklyUploadData] = useState([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState([]);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [activeDaysLast14, setActiveDaysLast14] = useState(0);
  const [avgUploadsPerActiveDay, setAvgUploadsPerActiveDay] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [uploadToast, setUploadToast] = useState({ visible: false, id: 0, message: "" });
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const audioInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const displayName = user?.name?.trim();

  const refreshDashboardStats = async (token) => {
    try {
      if (!token) {
        setTotalNotes(0);
        setTotalSubjects(0);
        setImportantTopicsCount(0);
        setRecentUploadsCount(0);
        setWeeklyUploadData([]);
        setSubjectBreakdown([]);
        setConsistencyScore(0);
        setCurrentStreak(0);
        setActiveDaysLast14(0);
        setAvgUploadsPerActiveDay(0);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/my-notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const notes = Array.isArray(res.data) ? res.data : [];
      setTotalNotes(notes.length);

      const savedImportantIds = JSON.parse(localStorage.getItem("importantNoteIds") || "[]");
      const savedIdSet = new Set(savedImportantIds);
      const importantCount = notes.filter((note) => savedIdSet.has(note._id)).length;
      setImportantTopicsCount(importantCount);

      const recentThreshold = Date.now() - RECENT_UPLOADS_DAYS * 24 * 60 * 60 * 1000;
      const recentCount = notes.filter((note) => {
        if (!note.created_at) return false;
        const createdAt = new Date(note.created_at).getTime();
        return Number.isFinite(createdAt) && createdAt >= recentThreshold;
      }).length;
      setRecentUploadsCount(recentCount);

      const uploadsByDateKey = new Map();
      notes.forEach((note) => {
        const key = toIstDateKey(note.created_at);
        if (!key) return;
        uploadsByDateKey.set(key, (uploadsByDateKey.get(key) || 0) + 1);
      });

      const weekData = [];
      for (let index = 6; index >= 0; index -= 1) {
        const dayDate = new Date(Date.now() - index * DAY_MS);
        const dayKey = toIstDateKey(dayDate);
        weekData.push({
          label: toIstWeekdayLabel(dayDate),
          count: uploadsByDateKey.get(dayKey) || 0,
        });
      }
      setWeeklyUploadData(weekData);

      const subjectCounts = new Map();
      notes.forEach((note) => {
        const subject = extractSubject(note.structured_note || note.raw_note || "") || "Untitled";
        subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
      });

      const topSubjects = Array.from(subjectCounts.entries())
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setSubjectBreakdown(topSubjects);

      const fourteenDayKeys = [];
      for (let index = 13; index >= 0; index -= 1) {
        fourteenDayKeys.push(toIstDateKey(new Date(Date.now() - index * DAY_MS)));
      }

      const activeDays = fourteenDayKeys.filter((key) => (uploadsByDateKey.get(key) || 0) > 0).length;
      setActiveDaysLast14(activeDays);

      const uploadsInLast14 = fourteenDayKeys.reduce(
        (sum, key) => sum + (uploadsByDateKey.get(key) || 0),
        0
      );
      const averagePerActiveDay = activeDays > 0 ? uploadsInLast14 / activeDays : 0;
      setAvgUploadsPerActiveDay(Number(averagePerActiveDay.toFixed(1)));

      const consistency = Math.round((activeDays / 14) * 100);
      setConsistencyScore(consistency);

      let streak = 0;
      for (let index = 0; index < 365; index += 1) {
        const dayKey = toIstDateKey(new Date(Date.now() - index * DAY_MS));
        if ((uploadsByDateKey.get(dayKey) || 0) > 0) {
          streak += 1;
        } else {
          break;
        }
      }
      setCurrentStreak(streak);

      const uniqueSubjects = new Set(
        notes
          .map((note) => extractSubject(note.structured_note || note.raw_note || ""))
          .filter(Boolean)
      );
      setTotalSubjects(uniqueSubjects.size);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      setTotalNotes(0);
      setTotalSubjects(0);
      setImportantTopicsCount(0);
      setRecentUploadsCount(0);
      setWeeklyUploadData([]);
      setSubjectBreakdown([]);
      setConsistencyScore(0);
      setCurrentStreak(0);
      setActiveDaysLast14(0);
      setAvgUploadsPerActiveDay(0);
    }
  };

  useEffect(() => {
    if (!uploadToast.visible) return;

    const timeoutId = setTimeout(() => {
      setUploadToast((prev) => ({ ...prev, visible: false }));
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [uploadToast.id, uploadToast.visible]);

  useEffect(() => {
    refreshDashboardStats(localStorage.getItem("token"));
  }, []);

  const showToast = (message) => {
    setUploadToast({ visible: true, id: Date.now(), message });
  };

  const triggerAudioPicker = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    audioInputRef.current?.click();
  };

  const triggerPdfPicker = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    pdfInputRef.current?.click();
  };

  const handleAudioUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsAudioUploading(true);

      await axios.post(`${API_BASE_URL}/upload-audio`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Refresh stats after upload to keep note and subject counts accurate.
      await refreshDashboardStats(token);

      showToast("Audio uploaded and converted to notes ✅");
    } catch (error) {
      console.error("Failed to upload audio:", error);
      showToast("Audio upload failed. Please try again.");
    } finally {
      setIsAudioUploading(false);
      event.target.value = "";
    }
  };

  const handlePdfUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsPdfUploading(true);

      await axios.post(`${API_BASE_URL}/upload-pdf`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      await refreshDashboardStats(token);
      showToast("PDF uploaded and converted to notes ✅");
    } catch (error) {
      const backendMessage = error?.response?.data?.detail;
      console.error("Failed to upload PDF:", error);
      showToast(backendMessage || "PDF upload failed. Please try another PDF.");
    } finally {
      setIsPdfUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      
      {/* Main Content */}
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-8 sm:mb-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <img
                src={studyMinutesLogo}
                alt="StudyMinutes logo"
                className="h-7 w-7 sm:h-10 sm:w-10 rounded-md object-contain"
              />
              <p className="text-lg sm:text-2xl font-bold tracking-wide text-blue-400">
                StudyMinutes
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              {displayName ? `Welcome ${displayName} 👋` : "Welcome back 👋"}
            </h1>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              Ready to revise smarter with AI?
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/chat")}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-700"
            >
              <MessageSquare size={16} />
              Chat with your notes
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfile((prev) => !prev)}
                className="bg-blue-600 w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold hover:bg-blue-700"
                aria-label="Open profile menu"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-44 bg-[#1e293b] rounded-lg shadow-lg border border-gray-700">
                  <div className="px-4 py-2 border-b border-gray-700 text-sm text-gray-300 truncate">
                    {user?.name || "User"}
                  </div>

                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-[#334155]"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      navigate("/", { replace: true });
                    }}
                    className="block w-full text-left px-4 py-2 text-red-400 hover:bg-[#334155]"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
          />

          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handlePdfUpload}
            className="hidden"
          />

          {/* Add Note */}
          <button
            onClick={() => setShowNotesModal(true)}
            className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-5 sm:p-6 text-left border border-slate-700 hover:border-blue-500 group"
          >
            <Plus className="text-blue-500 group-hover:scale-110 transition mb-4" size={28} />
            <h2 className="text-lg font-medium">Add New Note</h2>
            <p className="text-slate-400 text-sm mt-1">
              Write or paste your important study notes
            </p>
          </button>

          {/* Upload Audio */}
          <button
            onClick={triggerAudioPicker}
            disabled={isAudioUploading}
            className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-5 sm:p-6 text-left border border-slate-700 hover:border-blue-500 group disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Mic className="text-blue-500 group-hover:scale-110 transition mb-4" size={28} />
            <h2 className="text-lg font-medium">
              {isAudioUploading ? "Uploading Audio..." : "Upload Audio"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Convert lecture recordings into structured notes
            </p>
          </button>

          {/* Upload PDF */}
          <button
            onClick={triggerPdfPicker}
            disabled={isPdfUploading}
            className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-5 sm:p-6 text-left border border-slate-700 hover:border-blue-500 group disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FileText className="text-blue-500 group-hover:scale-110 transition mb-4" size={28} />
            <h2 className="text-lg font-medium">
              {isPdfUploading ? "Uploading PDF..." : "Upload PDF"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Extract key concepts from PDF notes
            </p>
          </button>

        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

          <button
            onClick={() => navigate("/notes")}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-blue-500 transition text-left"
          >
            <p className="text-slate-400 text-sm">Total Notes</p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2">{totalNotes}</h2>
          </button>

          <button
            onClick={() => navigate("/subject")}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-blue-500 transition text-left"
          >
            <p className="text-slate-400 text-sm">Subjects</p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2">{totalSubjects}</h2>
          </button>

          <button
            onClick={() => navigate("/notes?view=important")}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-blue-500 transition text-left"
          >
            <p className="text-slate-400 text-sm">Important Topics</p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2">{importantTopicsCount}</h2>
          </button>

          <button
            onClick={() => navigate("/notes?view=recent")}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-blue-500 transition text-left"
          >
            <p className="text-slate-400 text-sm">Recent Uploads</p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2">{recentUploadsCount}</h2>
          </button>

        </div>

        {/* Analytics Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-full rounded-2xl border border-slate-700 bg-slate-800 p-5 lg:col-span-2 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upload Trend (Last 7 Days)</h3>
              <p className="text-xs text-slate-400">Daily uploads in IST</p>
            </div>

            {weeklyUploadData.length === 0 ? (
              <p className="text-sm text-slate-400">No upload data available yet.</p>
            ) : (
              <div className="grid flex-1 min-h-[220px] grid-cols-7 gap-2 sm:gap-3">
                {weeklyUploadData.map((day) => {
                  const maxCount = Math.max(...weeklyUploadData.map((item) => item.count), 1);
                  const heightPct = Math.max(8, Math.round((day.count / maxCount) * 100));
                  return (
                    <div key={day.label} className="flex h-full flex-col items-center gap-1">
                      <div className="text-xs leading-none text-slate-400">{day.count}</div>
                      <div className="flex w-full flex-1 items-end rounded-lg bg-slate-900 px-2 py-1">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-blue-600 to-cyan-400 transition-all"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <div className="text-xs leading-none text-slate-400">{day.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-lg font-semibold">Consistency</h3>
            <p className="mt-1 text-sm text-slate-400">Based on your last 14 days</p>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-400">Consistency Score</p>
                <p className="text-3xl font-bold text-cyan-300">{consistencyScore}%</p>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  style={{ width: `${Math.min(consistencyScore, 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <p className="text-slate-400">Current Streak</p>
                  <p className="mt-1 text-xl font-semibold">{currentStreak} days</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <p className="text-slate-400">Active Days</p>
                  <p className="mt-1 text-xl font-semibold">{activeDaysLast14}/14</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm">
                <p className="text-slate-400">Avg uploads on active days</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">{avgUploadsPerActiveDay}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Top Subjects by Uploads</h3>
              <p className="text-xs text-slate-400">Your most uploaded subjects</p>
            </div>

            {subjectBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400">Upload notes to see subject analysis.</p>
            ) : (
              <div className="space-y-3">
                {subjectBreakdown.map((item) => {
                  const maxCount = Math.max(...subjectBreakdown.map((entry) => entry.count), 1);
                  const widthPct = Math.max(10, Math.round((item.count / maxCount) * 100));
                  return (
                    <div key={item.subject}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <p className="truncate pr-3 text-slate-200">{item.subject}</p>
                        <p className="text-slate-400">{item.count}</p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {showNotesModal && (
          <UploadNotes
            onClose={() => setShowNotesModal(false)}
            onUploadSuccess={async () => {
              const token = localStorage.getItem("token");
              await refreshDashboardStats(token);

              showToast("Notes uploaded successfully ✅");
            }}
          />
        )}

        {uploadToast.visible && (
          <div className="fixed bottom-4 right-4 z-[60] rounded-lg bg-[#1e293b] border border-gray-700 px-4 py-3 text-sm text-white shadow-lg">
            {uploadToast.message}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;