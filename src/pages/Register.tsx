import { useState } from "react";
import { registerApi } from "../api/auth";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await registerApi(form);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  // 👇 SUCCESS SCREEN
  if (success) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="p-6 border rounded text-center space-y-3">
          <h1 className="text-xl font-bold">Check your email 📧</h1>
          <p className="text-gray-600">
            We’ve sent you an activation link.  
            Please activate your account before logging in.
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
        className="w-96 p-6 border rounded space-y-3"
      >
        <h1 className="text-xl font-bold text-center">Register</h1>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          className="w-full border p-2"
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full border p-2"
          placeholder="First Name"
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <input
          className="w-full border p-2"
          placeholder="Last Name"
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
        <input
          className="w-full border p-2"
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button className="w-full bg-black text-white py-2">
          Register
        </button>
      </form>
    </div>
  );
}
