import { ArrowRight, Check, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { startLogin } from "@/const";

type LoginMode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("login");

  return (
    <main className="auth-page">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <section className="auth-brand-panel">
        <div className="brand auth-brand"><span className="brand-mark"><i /><i /><i /></span><span><b className="brand-name">NOVA<span>/</span>CART</b><small className="brand-sub">LOCALSYNC <i>•</i> 01</small></span></div>
        <div className="auth-message">
          <span className="hero-kicker"><span className="live-dot" /> CONNECTED COMMERCE</span>
          <h1>Confidence<br /><em>before convenience.</em></h1>
          <p>One connected operating picture for shoppers, stores, and the people keeping local commerce reliable.</p>
          <div className="auth-proof"><span><Check size={14} /> Every account is remembered</span><span><Check size={14} /> Google-ready sign in</span><span><Check size={14} /> Private session by default</span></div>
        </div>
        <div className="auth-footer">NOVA CART LOCALSYNC <span>FROM AVAILABLE TO RELIABLE.</span></div>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-card-icon"><Sparkles size={18} /></div>
          <div className="auth-card-head"><span className="mini-label">YOUR LOCALSYNC ACCOUNT</span><h2>{mode === "login" ? "Welcome back." : "Create your account."}</h2><p>{mode === "login" ? "Sign in to continue your connected commerce journey." : "Join the network and keep every meaningful interaction connected."}</p></div>
          <div className="auth-tabs"><button className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("login")}>Log in</button><button className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("signup")}>Sign up</button></div>
          <button className="google-button" onClick={() => startLogin()}><span className="google-mark">G</span><span>{mode === "login" ? "Continue with Google" : "Sign up with Google"}</span><ArrowRight size={16} /></button>
          <div className="auth-divider"><span>secure managed login</span></div>
          <div className="auth-security"><LockKeyhole size={15} /><span>Your name, email, and sign-in method are saved to your NOVA CART account so your history is there when you return.</span></div>
          <p className="auth-switch">{mode === "login" ? "New to NOVA CART?" : "Already have an account?"} <button onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Create one" : "Log in"}</button></p>
        </div>
        <small className="auth-legal">By continuing, you agree to use the managed NOVA CART authentication flow.</small>
      </section>
    </main>
  );
}
