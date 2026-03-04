import { useState } from "react";
import { FiPlus, FiMic, FiFile } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const ChatArea = ({ messages, setMessages, user, onRequireLogin }) => {
  const [input, setInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="flex-1 flex flex-col bg-[#0f172a] text-white">

      {/* Top Navbar */}
      <div className="flex justify-end items-center p-4 border-b border-gray-800 relative">

        {/* Upload Buttons */}
        <div className="flex gap-3 mr-6">
          <button
            onClick={handleAuthRequiredClick}
            className="bg-[#1e293b] hover:bg-[#334155] px-3 py-1 rounded-lg text-sm flex items-center gap-2"
          >
            <FiPlus /> Notes
          </button>
          <button
            onClick={handleAuthRequiredClick}
            className="bg-[#1e293b] hover:bg-[#334155] px-3 py-1 rounded-lg text-sm flex items-center gap-2"
          >
            <FiMic /> Audio
          </button>
          <button
            onClick={handleAuthRequiredClick}
            className="bg-[#1e293b] hover:bg-[#334155] px-3 py-1 rounded-lg text-sm flex items-center gap-2"
          >
            <FiFile /> PDF
          </button>
        </div>

        {/* Profile / Register */}
        <div className="relative">
          {!user ? (
            // 🔓 If NOT logged in
            <button
              onClick={promptLogin}
              className="text-gray-400 hover:text-white text-sm transition-colors"
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
                    onClick={() => navigate("/dashboard")}
                    className="block w-full text-left px-4 py-2 hover:bg-[#334155]"
                  >
                    Dashboard
                  </button>

                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-[#334155]"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      window.location.reload();
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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl max-w-[75%] ${
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
      <div className="p-4 border-t border-gray-800 max-w-3xl mx-auto w-full">
        <div className="flex bg-[#1e293b] rounded-xl p-2">
          <input
            type="text"
            placeholder="Ask about your important topics..."
            className="flex-1 bg-transparent outline-none px-3 text-sm"
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
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;