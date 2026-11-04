import { useMemo, useState } from "react";
import {
  BarChart3, Bell, Bot, Building2, ClipboardList, Database, Home, LogOut,
  Menu, UserRound, Users, Wrench, X, BedDouble, CheckCircle2, Clock3
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import SmartChat from "../components/SmartChat.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function PortalPage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [page, setPage] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);

  const menu = useMemo(() => {
    const common = [
      ["dashboard", t.dashboard, Home],
      ["dormitories", t.dormitories, Building2],
      [user?.role === "admin" ? "applications" : "myApplications", user?.role === "admin" ? t.applications : t.myApplications, ClipboardList],
      ...(user?.role === "admin" ? [["residents", t.residents, Users]] : []),
      ["maintenance", t.maintenance, Wrench],
      ["assistant", t.assistant, Bot],
      ["analytics", t.analytics, BarChart3],
      ["notifications", t.notifications, Bell],
      ["profile", t.profile, UserRound]
    ];
    return common;
  }, [t, user]);

  const selectPage = (id) => {
    setPage(id);
    setMobileMenu(false);
  };

  const content = () => {
    if (page === "assistant") return <SmartChat />;
    if (page === "profile") return <Profile user={user} t={t} />;
    if (page === "dashboard") return <Dashboard user={user} t={t} />;
    if (page === "dormitories") return <DormitoriesDemo t={t} />;
    return <Placeholder title={menu.find((m) => m[0] === page)?.[1] || page} t={t} />;
  };

  return (
    <div className="portal-shell">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="sidebar-brand"><span className="brand-mark"><Building2 size={20}/></span><div><strong>SmartDorm</strong><small>ALMATY</small></div></div>
        <nav className="sidebar-nav">
          {menu.map(([id, label, Icon]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => selectPage(id)}>
              <Icon size={18}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="logout-button" onClick={logout}><LogOut size={18}/><span>{t.logout}</span></button>
      </aside>

      {mobileMenu && <button className="sidebar-overlay" onClick={() => setMobileMenu(false)}></button>}

      <div className="portal-main">
        <header className="portal-header">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X/> : <Menu/>}</button>
          <div><strong>{t.portal}</strong><span>{t.almatyOnly}</span></div>
          <div className="portal-header-actions">
            <LanguageSwitcher compact />
            <div className="profile-chip">
              <span>{user?.fullName?.split(" ").map((x) => x[0]).slice(0,2).join("").toUpperCase()}</span>
              <div><strong>{user?.fullName}</strong><small>{user?.role === "admin" ? t.administrator : t.student}</small></div>
            </div>
          </div>
        </header>
        <main className="portal-content">{content()}</main>
      </div>
    </div>
  );
}

function Dashboard({ user, t }) {
  const admin = user?.role === "admin";
  return (
    <div>
      <div className="portal-welcome">
        <div><span>{admin ? t.administrator : t.student}</span><h1>{t.welcome}</h1><p>{admin ? t.adminHomeText : t.studentHomeText}</p></div>
        <div className="welcome-badge"><Building2 size={30}/><strong>ALMATY</strong></div>
      </div>

      <div className="status-strip">
        <span className="ok"><Database size={16}/>{t.dbConnected}</span>
        <span className="ok"><Bot size={16}/>{t.botActive}</span>
        <span className="prototype"><BarChart3 size={16}/>{t.mlPrototype}</span>
      </div>

      <div className="portal-stats">
        <Stat icon={<Building2/>} value="12" label={t.availableDorms} note={t.demoData}/>
        <Stat icon={<ClipboardList/>} value={admin ? "28" : "1"} label={t.activeApps} note={t.demoData}/>
        <Stat icon={<Wrench/>} value={admin ? "7" : "0"} label={t.openMaintenance} note={t.demoData}/>
      </div>

      <div className="portal-grid">
        <section className="panel">
          <div className="panel-head"><div><small>SMARTDORM</small><h3>{t.dormitories}</h3></div><BedDouble size={21}/></div>
          <div className="mini-list">
            <div><span><Building2 size={16}/> IITU Residence</span><b>12</b></div>
            <div><span><Building2 size={16}/> KazNU Student House</span><b>24</b></div>
            <div><span><Building2 size={16}/> Satbayev Dormitory</span><b>9</b></div>
          </div>
          <small className="demo-label">{t.demoData}</small>
        </section>

        <section className="panel">
          <div className="panel-head"><div><small>AI</small><h3>Smart Assistant</h3></div><Bot size={21}/></div>
          <div className="assistant-preview"><span className="bot-orb"><Bot/></span><p>{t.chatIntro}</p></div>
          <div className="ai-pills"><span><CheckCircle2 size={14}/> FAQ</span><span><Clock3 size={14}/> 24/7</span><span>3 LANG</span></div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, value, label, note }) {
  return <article className="stat-card"><span className="stat-icon">{icon}</span><div><strong>{value}</strong><span>{label}</span><small>{note}</small></div></article>;
}

function Profile({ user, t }) {
  const rows = [
    [t.fullName, user?.fullName],
    [t.email, user?.email],
    [t.phone, user?.phone],
    [t.role, user?.role === "admin" ? t.administrator : t.student],
    [t.university, user?.university || "—"],
    [t.faculty, user?.faculty || "—"],
    [t.course, user?.course || "—"],
    [t.position, user?.position || "—"],
    [t.orgType, user?.organizationType || "—"],
    [t.dormName, user?.dormitoryName || "—"],
    [t.dormAddress, user?.dormitoryAddress || "—"],
    [t.city, "Almaty"]
  ].filter(([, value]) => value && value !== "—");

  return (
    <div>
      <div className="page-title"><span>SMARTDORM</span><h1>{t.profileTitle}</h1><p>{t.savedInDb}</p></div>
      <section className="profile-card">
        <div className="profile-avatar-large">{user?.fullName?.split(" ").map((x) => x[0]).slice(0,2).join("").toUpperCase()}</div>
        <div className="profile-rows">{rows.map(([k,v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      </section>
    </div>
  );
}

function DormitoriesDemo({ t }) {
  const cards = [
    ["IITU Residence", "IITU", "12"],
    ["KazNU Student House", "KazNU", "24"],
    ["Satbayev Dormitory", "Satbayev University", "9"],
    ["KBTU Residence", "KBTU", "6"],
    ["Narxoz Dormitory", "Narxoz University", "15"],
    ["AlmaU Residence", "AlmaU", "8"]
  ];
  return (
    <div>
      <div className="page-title"><span>ALMATY</span><h1>{t.dormitories}</h1><p>{t.almatyOnly} • {t.demoData}</p></div>
      <div className="dorm-demo-grid">
        {cards.map(([name, uni, beds]) => (
          <article key={name} className="dorm-demo-card">
            <div className="dorm-demo-image"><Building2 size={36}/></div>
            <div><small>{uni}</small><h3>{name}</h3><p>{beds} available places</p><button>View details</button></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Placeholder({ title, t }) {
  return (
    <div>
      <div className="page-title"><span>SMARTDORM</span><h1>{title}</h1><p>{t.pageSoon}</p></div>
      <section className="empty-panel"><span className="soft-icon"><Building2/></span><h3>{title}</h3><p>{t.pageSoon}</p></section>
    </div>
  );
}
