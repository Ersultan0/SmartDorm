import { useState } from "react";
import { ArrowRight, Bot, Building2, CheckCircle2, Database, Download, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";
import AuthModal from "../components/AuthModal.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LandingPage() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [authMode, setAuthMode] = useState(null);

  if (token) return <Navigate to="/portal" replace />;

  return (
    <div className="landing-shell">
      <header className="public-header">
        <a href="#top" className="brand">
          <span className="brand-mark"><Building2 size={20} /></span>
          <span>SmartDorm</span>
        </a>

        <nav className="public-nav">
          <a href="#about">{t.about}</a>
          <a href="#features">{t.features}</a>
        </nav>

        <div className="public-actions">
          <LanguageSwitcher />
          <button className="ghost-button" onClick={() => setAuthMode("login")}>{t.login}</button>
          <button className="green-button" onClick={() => setAuthMode("register")}>{t.register}</button>
        </div>
      </header>

      <main id="top">
        <section className="public-hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} />{t.badge}</div>
            <h1>{t.hero1}<span>{t.hero2}</span></h1>
            <p>{t.heroText}</p>
            <div className="hero-actions">
              <button className="green-button large" onClick={() => setAuthMode("login")}>{t.enter}<ArrowRight size={18} /></button>
              <a className="outline-button large" href="#about">{t.more}</a>
            </div>
            <div className="hero-metrics">
              <div><strong>ALM</strong><span>{t.oneCity}</span></div>
              <div><strong>✓</strong><span>{t.verified}</span></div>
              <div><strong>24/7</strong><span>{t.always}</span></div>
            </div>
          </div>

          <div className="hero-panel-wrap">
            <div className="hero-glow"></div>
            <div className="system-card">
              <div className="system-card-head">
                <div className="soft-icon"><Building2 /></div>
                <div><small>{t.already}</small><h3>{t.allInOne}</h3></div>
              </div>
              {[t.freePlaces, t.onlineApply, t.track, t.chatbot].map((text) => (
                <div className="system-row" key={text}><CheckCircle2 size={19} /><span>{text}</span></div>
              ))}
              <div className="system-status">
                <span><Database size={15} /> DB</span>
                <span><Bot size={15} /> AI</span>
                <span>ALMATY</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-block" id="about">
          <div className="section-center">
            <span className="section-kicker">SMARTDORM • ALMATY</span>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutText}</p>
          </div>
        </section>

        <section className="feature-cards" id="features">
          <article><span>01</span><h3>{t.f1}</h3><p>{t.f1t}</p></article>
          <article><span>02</span><h3>{t.f2}</h3><p>{t.f2t}</p></article>
          <article><span>03</span><h3>{t.f3}</h3><p>{t.f3t}</p></article>
        </section>

        <section className="download-banner">
          <div>
            <span className="section-kicker light">MOBILE APPLICATION</span>
            <h2>{t.downloadTitle}</h2>
            <p>{t.downloadText}</p>
          </div>
          <div className="download-side">
            <a href="#" className="download-link"><Download size={18} />{t.download}</a>
            <small>{t.linkLater}</small>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="footer-brand"><span className="brand-mark small"><Building2 size={16}/></span><div><strong>SmartDorm</strong><span>{t.footer}</span></div></div>
        <span>© 2026 SmartDorm</span>
      </footer>

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitch={(mode) => setAuthMode(mode)}
        />
      )}
    </div>
  );
}
