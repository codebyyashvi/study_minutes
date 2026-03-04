import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const Home = () => {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
  ]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const [chats, setChats] = useState([
    { id: 1, title: "Semiconductor Revision" },
    { id: 2, title: "DBMS Important Questions" },
  ]);

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/auth/google", {
        token: credentialResponse.credential,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.location.reload();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="flex">
      <Sidebar
        chats={chats}
        setChats={setChats}
        setMessages={setMessages}
        user={user}
        onRequireLogin={() => setShowLoginModal(true)}
      />
      <ChatArea
        messages={messages}
        setMessages={setMessages}
        user={user}
        onRequireLogin={() => setShowLoginModal(true)}
      />

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl w-80 text-center border border-gray-700">
            <h2 className="text-xl font-bold mb-2 text-white">Welcome to StudyMinutes</h2>
            <p className="text-sm text-gray-300 mb-6">Login or register to continue</p>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => console.log("Login Failed")}
              />
            </div>

            <button
              onClick={() => setShowLoginModal(false)}
              className="mt-5 text-sm text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;