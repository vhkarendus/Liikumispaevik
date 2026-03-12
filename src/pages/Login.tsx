import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    if (username.length < 5) {
      setError("Kasutajanimi peab olema pikem kui 4 tähemärki");
      return;
    }
    if (password.length < 5) {
      setError("Parool peab olema pikem kui 4 tähemärki");
      return;
    }

    setLoading(true);
    const { error } = await login(username, password);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      navigate("/");
    }
  };

  return (
    <div style={{ maxWidth: 320, margin: "80px auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Logi sisse</h1>
      {error && (
        <div className="text-destructive text-sm mb-3 border border-destructive rounded-sm p-2">
          {error}
        </div>
      )}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Kasutajanimi</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background"
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Parool</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background"
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
      </div>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm border-none cursor-pointer disabled:opacity-50"
      >
        {loading ? "Sisenen..." : "Sisene"}
      </button>
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => navigate("/register")}
          className="text-primary text-sm bg-transparent border-none cursor-pointer underline"
        >
          Registreeri kasutaja
        </button>
      </div>
    </div>
  );
}
