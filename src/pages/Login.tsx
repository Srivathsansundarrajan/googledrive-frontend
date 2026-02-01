import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await loginApi({ email, password });
      auth.login(res.data.token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
  <div className="h-screen flex items-center justify-center">
    <form
      onSubmit={submit}
      className="w-96 p-6 border rounded space-y-4"
    >
      <h1 className="text-xl font-bold text-center">Login</h1>

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      <input
        className="w-full border p-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full border p-2"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="w-full bg-black text-white py-2">
        Login
      </button>

      {/* 👇 Navigation links */}
      <div className="text-center space-y-2">
        <Link
          to="/forgot-password"
          className="text-sm text-blue-600 block"
        >
          Forgot password?
        </Link>

        <Link
          to="/register"
          className="text-sm text-blue-600 block"
        >
          Create an account
        </Link>
      </div>
    </form>
  </div>
);
}
