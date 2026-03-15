import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import PasswordInput from "@/components/diary/PasswordInput";

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useAuth();

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

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Google sisselogimine ebaõnnestus");
      }
    } catch {
      setError("Google sisselogimine ebaõnnestus");
    }
    setGoogleLoading(false);
  };

  return (
    <div style={{ maxWidth: 320, margin: "80px auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Logi sisse</h1>
      {error && (
        <div className="text-destructive text-sm mb-3 border border-destructive rounded-sm p-2">
          {error}
        </div>
      )}

      {/* Google login button */}
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2 border border-border rounded-sm px-4 py-2 text-sm bg-background hover:bg-accent cursor-pointer disabled:opacity-50 mb-4"
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {googleLoading ? "Sisenen..." : "Logi sisse Google'iga"}
      </button>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">või</span>
        <div className="flex-1 h-px bg-border" />
      </div>

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
        <PasswordInput
          value={password}
          onChange={setPassword}
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
