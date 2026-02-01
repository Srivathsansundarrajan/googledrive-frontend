import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { activateApi } from "../api/auth";

export default function Activate() {
  const { token } = useParams();
  const [message, setMessage] = useState("Activating...");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    activateApi(token)
      .then((res) => {
        setMessage(res.data.message);
        setTimeout(() => navigate("/login"), 2000);
      })
      .catch(() => {
        setMessage("Activation failed or link expired");
      });
  }, [token]);

  return (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-lg font-semibold">{message}</h1>
    </div>
  );
}
