import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../api/auth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await forgotPasswordApi(email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Forgot Password Error:", err);
      const backendMsg = err.response?.data?.message || err.response?.data?.error;
      setError(backendMsg || "Failed to send reset link. Check backend logs.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-full max-w-md text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl animate-fadeIn space-y-4">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Check Your Email</h2>
          <p className="text-[var(--text-secondary)]">
            We've sent a password reset link to <span className="font-semibold text-[var(--accent)]">{email}</span>.
            Please check your inbox.
          </p>
          <div className="pt-4">
            <Link to="/">
              <Button variant="secondary" className="w-full">Back to Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <Card className="w-full max-w-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-white/20 dark:border-slate-700 shadow-xl animate-fadeIn">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Forgot Password?
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Enter your email to reset your password
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
          />

          <Button type="submit" className="w-full shadow-lg shadow-blue-500/30" isLoading={isLoading}>
            Send Reset Link
          </Button>

          <div className="text-center">
            <Link to="/" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
              ← Back to Login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
