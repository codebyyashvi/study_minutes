import { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import axios from "axios";
import UploadNotes from "./UploadNotes";
import TopNavbar from "./TopNavbar";

const ChatArea = ({ messages, setMessages, user, onRequireLogin, onOpenSidebar, activeChat, onMessageSent }) => {
  const [input, setInput] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [uploadToast, setUploadToast] = useState({ visible: false, id: 0, message: "" });
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";

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

  const sanitizeBotText = (text) => {
    if (typeof text !== "string") return "";
    return text.replace(/\*\*/g, "");
  };

  const handleAuthRequiredClick = () => {
    if (!user) {
      promptLogin();
    }
  };

  const handleSend = async () => {
    if (!user) {
      promptLogin();
      return;
    }

    if (!activeChat) {
      alert("Please select a chat first.");
      return;
    }

    if (!input.trim() || isBotLoading) return;

    const question = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsBotLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/chatbot`,
        { question, chat_id: activeChat.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: sanitizeBotText(response.data.answer) },
      ]);
      
      // Refresh chats list to update with new chat title
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: sanitizeBotText(detail || "Something went wrong. Please try again.") },
      ]);
    } finally {
      setIsBotLoading(false);
    }
  };

  const showToast = (message) => {
    setUploadToast({ visible: true, id: Date.now(), message });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a] text-white overflow-hidden">
      {/* Top Navbar Component */}
      <TopNavbar
        user={user}
        onRequireLogin={onRequireLogin}
        onOpenSidebar={onOpenSidebar}
        onShowNotesModal={setShowNotesModal}
        onShowToast={showToast}
        isAudioUploading={isAudioUploading}
        setIsAudioUploading={setIsAudioUploading}
        isPdfUploading={isPdfUploading}
        setIsPdfUploading={setIsPdfUploading}
      />

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 max-w-3xl mx-auto w-full mt-[80px] md:mt-[70px] mb-[90px] md:mb-[80px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 sm:p-3 rounded-xl max-w-[88%] sm:max-w-[75%] text-sm sm:text-base ${
              msg.role === "user"
                ? "bg-blue-600 ml-auto"
                : "bg-[#1e293b]"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isBotLoading && (
          <div className="p-2 sm:p-3 rounded-xl max-w-[88%] sm:max-w-[75%] text-sm sm:text-base bg-[#1e293b] text-gray-400 animate-pulse">
            Thinking...
          </div>
        )}
      </div>

      {/* Input - Fixed at bottom, aligned with content */}
      <div className="fixed bottom-0 left-0 right-0 md:left-72 p-2 sm:p-4 pb-6 sm:pb-8 border-t border-gray-800 bg-[#0f172a] z-10">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex bg-[#1e293b] rounded-xl p-1.5 sm:p-2">
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
            disabled={isBotLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm"
          >
            {isBotLoading ? "..." : "Send"}
          </button>
        </div>
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
        <div className="fixed bottom-4 right-2 sm:right-4 z-[60] flex items-start gap-2 sm:gap-3 rounded-lg bg-[#1e293b] border border-gray-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white shadow-lg max-w-[90%] sm:max-w-none">
          <span className="truncate">{uploadToast.message}</span>
          <button
            onClick={() => setUploadToast((prev) => ({ ...prev, visible: false }))}
            className="text-gray-300 hover:text-white flex-shrink-0"
            aria-label="Close notification"
          >
            <FiX size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatArea;