import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPasswordApi } from "../api/auth";

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await resetPasswordApi(token, password);
    navigate("/login");
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <form
        className="w-96 p-6 border rounded space-y-4"
        onSubmit={submit}
      >
        <h1 className="text-xl font-bold text-center">Reset Password</h1>

        <input
          className="w-full border p-2"
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-black text-white py-2">
          Reset Password
        </button>
      </form>
    </div>
  );
}
