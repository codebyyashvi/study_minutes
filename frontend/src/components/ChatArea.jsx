import { useState } from "react";
import { FiUser, FiPlus, FiMic, FiFile } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const ChatArea = ({ messages, setMessages }) => {
  const [input, setInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  const handleSend = () => {
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
          <button className="bg-[#1e293b] hover:bg-[#334155] px-3 py-1 rounded-lg text-sm flex items-center gap-2">
            <FiPlus /> Notes
          </button>
          <button className="bg-[#1e293b] hover:bg-[#334155] px-3 py-1 rounded-lg text-sm flex items-center gap-2">
            <FiMic /> Audio
          </button>
          <button className="bg-[#1e293b] hover:bg-[#334155] px-3 py-1 rounded-lg text-sm flex items-center gap-2">
            <FiFile /> PDF
          </button>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="bg-[#1e293b] p-2 rounded-full hover:bg-[#334155]"
          >
            <FiUser size={18} />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-40 bg-[#1e293b] rounded-lg shadow-lg border border-gray-700">
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
            </div>
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
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