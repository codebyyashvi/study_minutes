import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import axios from "axios";

const Home = () => {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const refreshTimeoutRef = useRef(null);
  const hasFetchedChatsRef = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";

  // Fetch chats on mount (only once)
  useEffect(() => {
    if (user && !hasFetchedChatsRef.current) {
      hasFetchedChatsRef.current = true;
      fetchChatsOnce();
    }
  }, []);

  // When chats are loaded and there's no active chat, set the first one as active
  useEffect(() => {
    if (chats.length > 0 && !activeChat) {
      setActiveChat(chats[0]);
      setMessages([
        { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
      ]);
    }
  }, [chats, activeChat]);

  const fetchChatsOnce = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/get-chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(response.data || []);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  const refreshChats = async () => {
    if (!user) return;
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Debounce: wait 1 second after last call before actually refreshing
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/get-chats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(response.data || []);
      } catch (error) {
        console.error("Failed to refresh chats:", error);
      }
    }, 1000);
  };

  return (
    <div className="relative flex min-h-screen bg-slate-900">
      <div className="hidden md:block w-72 shrink-0">
        <Sidebar
          chats={chats}
          setChats={setChats}
          setMessages={setMessages}
          user={user}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
        />
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div
        className={`fixed left-0 top-0 z-50 h-full w-72 transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          chats={chats}
          setChats={setChats}
          setMessages={setMessages}
          user={user}
          onClose={() => setIsSidebarOpen(false)}
          isMobile
          activeChat={activeChat}
          setActiveChat={setActiveChat}
        />
      </div>

      <div className="flex-1 min-w-0">
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          user={user}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          activeChat={activeChat}
          onMessageSent={refreshChats}
        />
      </div>
    </div>
  );
};

export default Home;