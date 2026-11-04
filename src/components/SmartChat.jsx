import { useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function SmartChat() {
  const { t, lang } = useLanguage();
  const { token } = useAuth();
  const [messages, setMessages] = useState([{ role: "bot", text: t.chatIntro }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Accept-Language": lang
        },
        body: JSON.stringify({ message: text, lang })
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.reply || "SmartDorm" }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Server connection error." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-heading">
        <span className="soft-icon"><Bot /></span>
        <div><h2>{t.chatTitle}</h2><p>SmartDorm AI • demo assistant</p></div>
      </div>
      <div className="chat-window">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div className={`message ${m.role}`} key={i}>
              <span className="message-avatar">{m.role === "bot" ? <Bot size={16}/> : <User size={16}/>}</span>
              <div>{m.text}</div>
            </div>
          ))}
          {busy && <div className="message bot"><span className="message-avatar"><Bot size={16}/></span><div>...</div></div>}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.chatPlaceholder} />
          <button><Send size={17}/><span>{t.send}</span></button>
        </form>
      </div>
    </div>
  );
}
