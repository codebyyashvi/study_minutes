import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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

const RECENT_UPLOADS_DAYS = 2;

const NotesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  const API_BASE_URL = "http://127.0.0.1:8000";

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importantNoteIds, setImportantNoteIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("importantNoteIds") || "[]");
    } catch {
      return [];
    }
  });

  const importantIdSet = useMemo(() => new Set(importantNoteIds), [importantNoteIds]);

  const toggleImportant = (noteId) => {
    setImportantNoteIds((prev) => {
      const alreadySaved = prev.includes(noteId);
      const next = alreadySaved ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      localStorage.setItem("importantNoteIds", JSON.stringify(next));
      return next;
    });
  };

  const deleteNote = async (noteId) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login again to delete notes.");
          return;
        }

        await axios.delete(`${API_BASE_URL}/notes/${noteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setNotes((prev) => prev.filter((note) => note._id !== noteId));
        setImportantNoteIds((prev) => prev.filter((id) => id !== noteId));
      } catch (err) {
        console.error("Failed to delete note:", err);
        setError("Could not delete the note. Please try again.");
      }
    }
  };

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

  const selectedSubject = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("subject") || "").trim();
  }, [location.search]);

  const selectedView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("view") || "").trim().toLowerCase();
  }, [location.search]);

  const filteredNotes = useMemo(() => {
    if (selectedView === "important") {
      return parsedNotes.filter((note) => importantIdSet.has(note._id));
    }

    if (selectedView === "recent") {
      const recentThreshold = Date.now() - RECENT_UPLOADS_DAYS * 24 * 60 * 60 * 1000;
      return parsedNotes
        .filter((note) => {
          if (!note.created_at) return false;
          const createdAt = new Date(note.created_at).getTime();
          return Number.isFinite(createdAt) && createdAt >= recentThreshold;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ;
    }

    if (!selectedSubject) return parsedNotes;

    const target = cleanMarkdown(selectedSubject).toLowerCase();
    return parsedNotes.filter(
      (note) => cleanMarkdown(note.parsed.subject).toLowerCase() === target
    );
  }, [importantIdSet, parsedNotes, selectedSubject, selectedView]);

  const pageTitle = useMemo(() => {
    if (selectedView === "important") return "Important Topics";
    if (selectedView === "recent") return "Recent Uploads";
    if (selectedSubject) return `Notes for ${selectedSubject}`;
    return "Your Notes";
  }, [selectedSubject, selectedView]);

  const emptyStateText = useMemo(() => {
    if (selectedView === "important") return "No important topics saved yet.";
    if (selectedView === "recent") return "No uploads found in the last 2 days.";
    if (selectedSubject) return `No notes found for ${selectedSubject}.`;
    return "No notes found yet.";
  }, [selectedSubject, selectedView]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(selectedSubject ? "/subject" : "/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
          >
            <ArrowLeft size={16} />
            {selectedSubject ? "Back to Subjects" : "Back to Dashboard"}
          </button>

          <p className="text-sm text-slate-400">My Notes ({filteredNotes.length})</p>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{pageTitle}</h1>

        {loading && <p className="text-slate-300">Loading your notes...</p>}
        {!loading && error && <p className="text-red-400">{error}</p>}
        {!loading && !error && filteredNotes.length === 0 && (
          <p className="text-slate-400">{emptyStateText}</p>
        )}

        <div className="space-y-4">
          {!loading && !error && filteredNotes.map((note) => (
            <div key={note._id} className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-xl font-bold uppercase tracking-wide text-blue-400">
                  Subject: {note.parsed.subject}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleImportant(note._id)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-amber-400"
                    aria-label={importantIdSet.has(note._id) ? "Unsave topic" : "Save topic"}
                    title={importantIdSet.has(note._id) ? "Saved as important" : "Save as important"}
                  >
                    <Bookmark
                      size={14}
                      className={importantIdSet.has(note._id) ? "text-amber-400" : "text-slate-300"}
                      fill={importantIdSet.has(note._id) ? "currentColor" : "none"}
                    />
                    Save
                  </button>

                  <button
                    onClick={() => deleteNote(note._id)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-red-500 hover:text-red-400"
                    aria-label="Delete note"
                    title="Delete this note"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>

                  <p className="text-xs text-slate-400">
                    {note.created_at ? new Date(note.created_at).toLocaleString() : "No date"}
                  </p>
                </div>
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
