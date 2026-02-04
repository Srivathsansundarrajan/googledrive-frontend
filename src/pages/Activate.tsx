import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { activateApi } from "../api/auth";
import Card from "../components/ui/Card";

export default function Activate() {
  const { token } = useParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Activating account...");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    activateApi(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
        setTimeout(() => navigate("/"), 3000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "Activation failed or link expired");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <Card className="w-full max-w-sm text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl animate-fadeIn space-y-4">
        {status === "loading" && (
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        )}

        {status === "success" && (
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {status === "error" && (
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}

        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {status === "loading" ? "Activating..." : status === "success" ? "Account Activated!" : "Activation Failed"}
        </h2>
        <p className="text-[var(--text-secondary)]">
          {message}
        </p>

        {status === "success" && (
          <p className="text-xs text-[var(--text-muted)] animate-pulse">
            Redirecting to login...
          </p>
        )}
      </Card>
    </div>
  );
}
