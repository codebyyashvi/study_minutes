import { useRef, useState } from "react";
import { FiPlus, FiMic, FiFile, FiMenu, FiGrid } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TopNavbar = ({
  user,
  onRequireLogin,
  onOpenSidebar,
  onShowNotesModal,
  onShowToast,
  isAudioUploading,
  setIsAudioUploading,
  isPdfUploading,
  setIsPdfUploading,
}) => {
  const [showProfile, setShowProfile] = useState(false);
  const audioInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.1:8000";
//   const API_BASE_URL = "http://127.0.0.1:8000";
  const navigate = useNavigate();

  const promptLogin = () => {
    if (onRequireLogin) onRequireLogin();
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

      onShowToast("Audio uploaded and converted to notes ✅");
    } catch (error) {
      console.error("Audio upload failed:", error);
      onShowToast("Audio upload failed. Please try again.");
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

      onShowToast("PDF uploaded and converted to notes ✅");
    } catch (error) {
      const backendMessage = error?.response?.data?.detail;
      console.error("PDF upload failed:", error);
      onShowToast(backendMessage || "PDF upload failed. Please try another PDF.");
    } finally {
      setIsPdfUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 md:left-72 flex items-center justify-between p-2 sm:p-4 border-b border-gray-800 gap-2 sm:gap-3 bg-[#0f172a] z-10">
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
          className="md:hidden p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155]"
          aria-label="Open sidebar"
        >
          <FiMenu size={16} />
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs sm:text-sm whitespace-nowrap"
        >
          <FiGrid size={14} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
      </div>

      <div className="flex items-center justify-end flex-1 min-w-0 gap-1 sm:gap-2">
        {/* Upload Buttons */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => {
              if (!user) {
                promptLogin();
              } else {
                onShowNotesModal(true);
              }
            }}
            className="bg-[#1e293b] hover:bg-[#334155] px-2 sm:px-3 py-1 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap"
          >
            <FiPlus size={14} /> <span className="hidden sm:inline">Notes</span>
          </button>
          <button
            onClick={triggerAudioPicker}
            disabled={isAudioUploading}
            className="bg-[#1e293b] hover:bg-[#334155] px-2 sm:px-3 py-1 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FiMic size={14} /> <span className="hidden sm:inline">{isAudioUploading ? "..." : "Audio"}</span>
          </button>
          <button
            onClick={triggerPdfPicker}
            disabled={isPdfUploading}
            className="bg-[#1e293b] hover:bg-[#334155] px-2 sm:px-3 py-1 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FiFile size={14} /> <span className="hidden sm:inline">{isPdfUploading ? "..." : "PDF"}</span>
          </button>
        </div>

        {/* Profile / Register */}
        <div className="relative">
          {!user ? (
            <button
              onClick={promptLogin}
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors whitespace-nowrap"
            >
              <span className="hidden sm:inline">Login</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="bg-blue-600 w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold hover:bg-blue-700"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-40 sm:w-44 bg-[#1e293b] rounded-lg shadow-lg border border-gray-700 z-50">
                  <div className="px-3 sm:px-4 py-2 border-b border-gray-700 text-xs sm:text-sm text-gray-300 truncate">
                    {user.name}
                  </div>

                  <button className="block w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-[#334155]">
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      navigate("/", { replace: true });
                    }}
                    className="block w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-400 hover:bg-[#334155]"
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
  );
};

export default TopNavbar;
