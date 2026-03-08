import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const cleanMarkdown = (text) => (text || "").replace(/\*\*/g, "").trim();

const extractSection = (text, label) => {
  const safe = cleanMarkdown(text);
  const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:Subject|Title|Explanation|Key Points):|$)`, "i");
  const match = safe.match(regex);
  return match ? match[1].trim() : "";
};

const parseStructuredNote = (structuredNote) => {
  const safe = cleanMarkdown(structuredNote);
  return {
    subject: extractSection(safe, "Subject") || "Untitled Subject",
    title: extractSection(safe, "Title") || "Untitled Note",
    explanation: extractSection(safe, "Explanation") || safe,
    keyPoints: extractSection(safe, "Key Points"),
  };
};

const NotesPage = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login again to view your notes.");
          setNotes([]);
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/my-notes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setNotes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch notes:", err);
        setError("Could not load your notes. Please try again.");
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [API_BASE_URL]);

  const parsedNotes = useMemo(() => {
    return notes.map((note) => ({
      ...note,
      parsed: parseStructuredNote(note.structured_note || note.raw_note || ""),
    }));
  }, [notes]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <p className="text-sm text-slate-400">My Notes ({parsedNotes.length})</p>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">Your Notes</h1>

        {loading && <p className="text-slate-300">Loading your notes...</p>}
        {!loading && error && <p className="text-red-400">{error}</p>}
        {!loading && !error && parsedNotes.length === 0 && (
          <p className="text-slate-400">No notes found yet.</p>
        )}

        <div className="space-y-4">
          {!loading && !error && parsedNotes.map((note) => (
            <div key={note._id} className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-xl font-bold uppercase tracking-wide text-blue-400">
                  Subject: {note.parsed.subject}
                </p>
                <p className="text-xs text-slate-400">
                  {note.created_at ? new Date(note.created_at).toLocaleString() : "No date"}
                </p>
              </div>

              <h2 className="text-lg sm:text-md font-semibold mb-3">
                {note.parsed.title}
              </h2>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {note.parsed.explanation}
                </p>

                {note.parsed.keyPoints && (
                  <div className="mt-4 border-t border-slate-700 pt-3">
                    <p className="text-sm font-medium text-slate-300 mb-2">Key Points</p>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {note.parsed.keyPoints}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
