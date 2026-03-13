import { FiPlus, FiSettings, FiX } from "react-icons/fi";
import { FiMoreVertical, FiTrash2, FiEdit2, FiBookmark } from "react-icons/fi";
import { useState } from "react";
import axios from "axios";

const Sidebar = ({
  chats,
  setChats,
  setMessages,
  user,
  onRequireLogin,
  onClose,
  isMobile = false,
  activeChat,
  setActiveChat,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const API_BASE_URL = "http://127.0.0.1:8000";

  const ensureAuth = () => {
    if (!user) {
      if (onRequireLogin) onRequireLogin();
      return false;
    }
    return true;
  };

  const handleNewChat = () => {
    if (!ensureAuth()) return;

    const newChat = {
      id: Date.now(),
      title: "New Chat",
    };

    setChats([newChat, ...chats]);
    setMessages([
      { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
    ]);
    setActiveChat(newChat);

    if (isMobile && onClose) onClose();
  };

  const handleSelectChat = async (chat) => {
    if (!ensureAuth()) return;
    
    setActiveChat(chat);
    
    // If chat is new (doesn't have timestamp property from backend),
    // don't try to fetch history - just show the greeting
    if (!chat.timestamp) {
      setMessages([
        { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
      ]);
    } else {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/get-chat-history/${chat.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Format messages as user and bot
        const formattedMessages = response.data.map((msg) => ({
          role: msg.role === "user" ? "user" : "bot",
          content: msg.content,
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Failed to load chat history:", error);
        setMessages([
          { role: "bot", content: "Failed to load chat history. Please try again." },
        ]);
      }
    }

    if (isMobile && onClose) onClose();
  };

  const [activeMenu, setActiveMenu] = useState(null);

  const handleDelete = async (id) => {
    if (!ensureAuth()) return;
    
    // Remove from UI
    setChats(chats.filter((chat) => chat.id !== id));
    setActiveMenu(null);
    
    // If deleted chat was active, clear messages
    if (activeChat?.id === id) {
      setActiveChat(null);
      setMessages([]);
    }
  };

  const handleRename = (id) => {
    if (!ensureAuth()) return;
    const newName = prompt("Enter new chat name:");
    if (!newName) return;

    setChats(
      chats.map((chat) =>
        chat.id === id ? { ...chat, title: newName } : chat,
      ),
    );
    setActiveMenu(null);
  };

  const handleSave = (id) => {
    if (!ensureAuth()) return;
    alert("Chat saved!");
    setActiveMenu(null);
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 flex flex-col px-4 py-6 border-r border-slate-800/60">
      {/* Logo */}
      <div className="mb-8 px-2 flex items-start justify-between gap-3">
        <div>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          AI Study Assistant
        </p>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <button
        onClick={handleNewChat}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-all px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-900/30"
      >
        <FiPlus size={16} /> New Chat
      </button>

      {/* Chat History */}
      <div className="mt-8 flex-1 overflow-y-auto space-y-2 pr-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-sm text-slate-400">Loading chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-sm text-slate-400">No chats yet. Start a new one!</p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={`group relative px-3 py-2 rounded-xl border transition-all cursor-pointer text-sm flex items-center justify-between ${
                activeChat?.id === chat.id
                  ? "bg-blue-600/20 border-blue-500/50"
                  : "bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60"
              } ${activeMenu === chat.id ? "z-50" : "z-10"}`}
            >
              <span className="truncate flex-1" title={chat.title}>{chat.title}</span>

              {/* 3 Dot Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!ensureAuth()) return;
                  setActiveMenu(activeMenu === chat.id ? null : chat.id);
                }}
                className="opacity-100 p-1 rounded-md hover:bg-slate-700/60 flex-shrink-0"
              >
                <FiMoreVertical size={16} />
              </button>

              {/* Dropdown Menu */}
              {activeMenu === chat.id && (
              <div className="absolute right-0 top-10 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
                  
                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(chat.id);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                  <FiEdit2 size={14} /> Rename
                  </button>

                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(chat.id);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                  <FiBookmark size={14} /> Save
                  </button>

                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(chat.id);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                  >
                  <FiTrash2 size={14} /> Delete
                  </button>

              </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Section */}
      <div className="mt-6">
        {/* Settings Section with Top & Bottom Border */}
        <div className="border-t border-b border-slate-800/60 py-4">
          <button
            onClick={ensureAuth}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <FiSettings size={16} /> Settings
          </button>
        </div>

        {/* Footer */}
        <div className="pt-1">
          <p className="text-[10px] text-slate-600 font-medium">
            © {new Date().getFullYear()} StudyMinutes • v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
