import { useState } from "react";
import { ChevronDown, Languages } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const labels = { kk: "ҚАЗ", ru: "РУС", en: "ENG" };

  return (
    <div className="language-menu">
      <button className={`language-button ${compact ? "compact" : ""}`} onClick={() => setOpen(!open)}>
        <Languages size={16} />
        {labels[lang]}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="language-dropdown">
          <button onClick={() => { setLang("kk"); setOpen(false); }}>Қазақша</button>
          <button onClick={() => { setLang("ru"); setOpen(false); }}>Русский</button>
          <button onClick={() => { setLang("en"); setOpen(false); }}>English</button>
        </div>
      )}
    </div>
  );
}
