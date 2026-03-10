import { useEffect, useRef, useState } from "react";
import { FiPlus, FiMic, FiFile, FiMenu, FiX, FiGrid } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UploadNotes from "./UploadNotes";

const ChatArea = ({ messages, setMessages, user, onRequireLogin, onOpenSidebar }) => {
  const [input, setInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [uploadToast, setUploadToast] = useState({ visible: false, id: 0, message: "" });
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const audioInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";
  const navigate = useNavigate();

  useEffect(() => {
    if (!uploadToast.visible) return;

    const timeoutId = setTimeout(() => {
      setUploadToast((prev) => ({ ...prev, visible: false }));
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [uploadToast.id, uploadToast.visible]);

  const promptLogin = () => {
    if (onRequireLogin) onRequireLogin();
  };

  const handleAuthRequiredClick = () => {
    if (!user) {
      promptLogin();
    }
  };

  const handleSend = () => {
    if (!user) {
      promptLogin();
      return;
    }

    if (!input.trim()) return;

    const updated = [
      ...messages,
      { role: "user", content: input },
      { role: "bot", content: "Demo AI response based on uploaded notes." },
    ];

    setMessages(updated);
    setInput("");
  };

  const showToast = (message) => {
    setUploadToast({ visible: true, id: Date.now(), message });
  };

  const triggerAudioPicker = () => {
    if (!user) {
      promptLogin();
      return;
    }

    audioInputRef.current?.click();
  };

  const triggerPdfPicker = () => {
    if (!user) {
      promptLogin();
      return;
    }

    pdfInputRef.current?.click();
  };

  const handleAudioUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const token = localStorage.getItem("token");
    if (!token) {
      promptLogin();
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

      showToast("Audio uploaded and converted to notes ✅");
    } catch (error) {
      console.error("Audio upload failed:", error);
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
      promptLogin();
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

      showToast("PDF uploaded and converted to notes ✅");
    } catch (error) {
      const backendMessage = error?.response?.data?.detail;
      console.error("PDF upload failed:", error);
      showToast(backendMessage || "PDF upload failed. Please try another PDF.");
    } finally {
      setIsPdfUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a] text-white">

      {/* Top Navbar */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-800 relative gap-3">
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

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155]"
            aria-label="Open sidebar"
          >
            <FiMenu size={18} />
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs sm:text-sm whitespace-nowrap"
          >
            <FiGrid size={16} />
            Dashboard
          </button>
        </div>

        <div className="flex items-center justify-end flex-1 min-w-0">

        {/* Upload Buttons */}
        <div className="flex gap-2 sm:gap-3 mr-3 sm:mr-6 overflow-x-auto">
          <button
            onClick={() => {
              if (!user) {
                promptLogin();
              } else {
                setShowNotesModal(true);
              }
            }}
            className="bg-[#1e293b] hover:bg-[#334155] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
          >
            <FiPlus /> <span className="hidden sm:inline">Notes</span>
          </button>
          <button
            onClick={triggerAudioPicker}
            disabled={isAudioUploading}
            className="bg-[#1e293b] hover:bg-[#334155] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FiMic /> <span className="hidden sm:inline">{isAudioUploading ? "Uploading..." : "Audio"}</span>
          </button>
          <button
            onClick={triggerPdfPicker}
            disabled={isPdfUploading}
            className="bg-[#1e293b] hover:bg-[#334155] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FiFile /> <span className="hidden sm:inline">{isPdfUploading ? "Uploading..." : "PDF"}</span>
          </button>
        </div>

        {/* Profile / Register */}
        <div className="relative">
          {!user ? (
            // 🔓 If NOT logged in
            <button
              onClick={promptLogin}
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors whitespace-nowrap"
            >
              Login or Register
            </button>
          ) : (
            // 🔐 If logged in
            <>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="bg-blue-600 w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold hover:bg-blue-700"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-44 bg-[#1e293b] rounded-lg shadow-lg border border-gray-700">
                  <div className="px-4 py-2 border-b border-gray-700 text-sm text-gray-300">
                    {user.name}
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
            </>
          )}
        </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl max-w-[88%] sm:max-w-[75%] ${
              msg.role === "user"
                ? "bg-blue-600 ml-auto"
                : "bg-[#1e293b]"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-gray-800 max-w-3xl mx-auto w-full">
        <div className="flex bg-[#1e293b] rounded-xl p-2">
          <input
            type="text"
            placeholder="Ask about your important topics..."
            className="flex-1 bg-transparent outline-none px-2 sm:px-3 text-sm"
            value={input}
            onFocus={(e) => {
              if (!user) {
                e.target.blur();
                promptLogin();
              }
            }}
            onChange={(e) => {
              if (!user) {
                promptLogin();
                return;
              }
              setInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg text-sm"
          >
            Send
          </button>
        </div>
      </div>
      {/* NOTES MODAL */}
      {showNotesModal && (
        <UploadNotes
          onClose={() => setShowNotesModal(false)}
          onUploadSuccess={() =>
            showToast("Notes uploaded successfully ✅")
          }
        />
      )}

      {uploadToast.visible && (
        <div className="fixed bottom-4 right-4 z-[60] flex items-start gap-3 rounded-lg bg-[#1e293b] border border-gray-700 px-4 py-3 text-sm text-white shadow-lg">
          <span>{uploadToast.message}</span>
          <button
            onClick={() => setUploadToast((prev) => ({ ...prev, visible: false }))}
            className="text-gray-300 hover:text-white"
            aria-label="Close notification"
          >
            <FiX size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatArea;