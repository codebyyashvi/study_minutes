import React, { useEffect, useRef, useState } from "react";
import { Plus, Mic, FileText, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UploadNotes from "../components/UploadNotes";

const cleanMarkdown = (text) => (text || "").replace(/\*\*/g, "").trim();

const extractSubject = (noteText) => {
  const safe = cleanMarkdown(noteText);
  const match = safe.match(/Subject:\s*([^\n]+)/i);
  return match ? match[1].trim() : "";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
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
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/my-notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const notes = Array.isArray(res.data) ? res.data : [];
      setTotalNotes(notes.length);

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
            <p className="mb-3 text-lg sm:text-xl font-bold tracking-wide text-blue-400">
              StudyMinutes
            </p>
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

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-blue-500 transition">
            <p className="text-slate-400 text-sm">Important Topics</p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2">15</h2>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-blue-500 transition">
            <p className="text-slate-400 text-sm">Recent Uploads</p>
            <h2 className="text-xl sm:text-2xl font-semibold mt-2">4</h2>
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