import { useState } from "react";
import { forgotPasswordApi } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await forgotPasswordApi(email);
      setSuccess(true); // 🔥 key change
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset link");
    }
  };

  // 👇 SUCCESS SCREEN
  if (success) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="p-6 border rounded text-center space-y-3">
          <h1 className="text-xl font-bold">Check your email 📧</h1>
          <p className="text-gray-600">
            We’ve sent you a password reset link.
            <br />
            Please check your inbox.
          </p>
        </div>
      </div>
    );
  }

  // 👇 FORM SCREEN
  return (
    <div className="h-screen flex items-center justify-center">
      <form
        onSubmit={submit}
        className="w-96 p-6 border rounded space-y-4"
      >
        <h1 className="text-xl font-bold text-center">Forgot Password</h1>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          className="w-full border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="w-full bg-black text-white py-2">
          Send Reset Link
        </button>
      </form>
    </div>
  );
}
