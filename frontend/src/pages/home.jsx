import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";

const Home = () => {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const [chats, setChats] = useState([
    { id: 1, title: "Semiconductor Revision" },
    { id: 2, title: "DBMS Important Questions" },
  ]);

  return (
    <div className="relative flex min-h-screen bg-slate-900">
      <div className="hidden md:block w-72 shrink-0">
        <Sidebar
          chats={chats}
          setChats={setChats}
          setMessages={setMessages}
          user={user}
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
        />
      </div>

      <div className="flex-1 min-w-0">
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          user={user}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
      </div>
    </div>
  );
};

export default Home;