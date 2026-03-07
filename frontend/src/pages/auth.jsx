import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AuthPage = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/google`, {
        token: credentialResponse.credential,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold">Welcome to StudyMinutes</h1>
        <p className="text-slate-300 mt-2 text-sm">
          Login or register first to continue to your dashboard.
        </p>

        <div className="mt-8 flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.log("Login Failed")}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
