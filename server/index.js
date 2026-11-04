import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";

const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || "smartdorm-local-development-secret-change-later";

app.use(cors());
app.use(express.json());

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRe = /^\+7 7\d{2} \d{3} \d{2} \d{2}$/;
const nameRe = /^[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё'’.-]+(?:\s+[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё'’.-]+)+$/u;
const passwordRe = /^(?=.*[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё])(?=.*\d).{8,}$/u;

function error(res, status, message, field = null) {
  return res.status(status).json({ message, field });
}

function nextId(items) {
  return items.length ? Math.max(...items.map((x) => Number(x.id) || 0)) + 1 : 1;
}

async function persist() {
  await db.write();
}

function loadUser(id) {
  const user = db.data.users.find((u) => u.id === Number(id));
  if (!user) return null;

  const safeUser = {
    id: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    city: user.city,
    createdAt: user.createdAt
  };

  if (user.role === "student") {
    const profile = db.data.studentProfiles.find((p) => p.userId === user.id) || {};
    return { ...safeUser, university: profile.university, faculty: profile.faculty, course: profile.course };
  }

  const profile = db.data.adminProfiles.find((p) => p.userId === user.id) || {};
  return {
    ...safeUser,
    position: profile.position,
    organizationType: profile.organizationType,
    university: profile.university,
    dormitoryName: profile.dormitoryName,
    dormitoryAddress: profile.dormitoryAddress
  };
}

app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};
  const {
    role, fullName, email, phone, password,
    university, faculty, course,
    position, organizationType, dormitoryName, dormitoryAddress
  } = body;

  if (!["student", "admin"].includes(role)) return error(res, 400, "Invalid role", "role");
  if (!fullName || !nameRe.test(fullName.trim())) return error(res, 400, "Full name must contain at least two words", "fullName");
  if (!email || !emailRe.test(email.trim())) return error(res, 400, "Invalid email format", "email");
  if (!phone || !phoneRe.test(phone)) return error(res, 400, "Phone format must be +7 777 123 45 67", "phone");
  if (!password || !passwordRe.test(password)) return error(res, 400, "Password must be at least 8 characters and contain a letter and a number", "password");

  if (role === "student") {
    if (!university) return error(res, 400, "University is required", "university");
    if (!faculty || faculty.trim().length < 2) return error(res, 400, "Faculty / major is required", "faculty");
    if (![1,2,3,4,5,6].includes(Number(course))) return error(res, 400, "Invalid year of study", "course");
  }

  if (role === "admin") {
    if (!["university", "private"].includes(organizationType)) return error(res, 400, "Organization type is required", "organizationType");
    if (organizationType === "university" && !university) return error(res, 400, "University is required", "university");
    if (!position || position.trim().length < 2) return error(res, 400, "Position is required", "position");
    if (!dormitoryName || dormitoryName.trim().length < 3) return error(res, 400, "Dormitory name is required", "dormitoryName");
    if (!dormitoryAddress || dormitoryAddress.trim().length < 6) return error(res, 400, "Dormitory address is required", "dormitoryAddress");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (db.data.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return error(res, 409, "This email is already registered", "email");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = nextId(db.data.users);
  const now = new Date().toISOString();

  db.data.users.push({
    id: userId,
    role,
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone,
    passwordHash,
    city: "Almaty",
    createdAt: now
  });

  if (role === "student") {
    db.data.studentProfiles.push({
      id: nextId(db.data.studentProfiles),
      userId,
      university,
      faculty: faculty.trim(),
      course: Number(course)
    });
  } else {
    db.data.adminProfiles.push({
      id: nextId(db.data.adminProfiles),
      userId,
      position: position.trim(),
      organizationType,
      university: organizationType === "university" ? university : null,
      dormitoryName: dormitoryName.trim(),
      dormitoryAddress: dormitoryAddress.trim()
    });
  }

  await persist();
  return res.status(201).json({ ok: true, userId });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !emailRe.test(email)) return error(res, 400, "Invalid email format", "email");
  if (!password) return error(res, 400, "Password is required", "password");

  const row = db.data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!row) return error(res, 401, "Invalid email or password");

  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return error(res, 401, "Invalid email or password");

  const user = loadUser(row.id);
  const token = jwt.sign({ sub: row.id, role: row.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return error(res, 401, "Unauthorized");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = Number(payload.sub);
    req.userRole = payload.role;
    next();
  } catch {
    return error(res, 401, "Invalid or expired token");
  }
}

app.get("/api/me", auth, (req, res) => {
  const user = loadUser(req.userId);
  if (!user) return error(res, 404, "User not found");
  res.json({ user });
});

app.post("/api/chat", auth, async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const lang = ["kk", "ru", "en"].includes(req.body?.lang) ? req.body.lang : "kk";
  if (!message) return error(res, 400, "Message is required");

  const lower = message.toLowerCase();
  const replies = {
    kk: {
      vacancy: "Бос орындар «Жатақханалар» бөлімінде көрсетіледі. Қазіргі нұсқадағы сандар демо деректер; кейін олар нақты базаға байланысады.",
      apply: "Жатақханаға өтініш беру үшін «Менің өтініштерім» бөліміне өтіңіз. Бұл функция келесі кезеңде толық іске қосылады.",
      docs: "Әдетте студент профилі, университет туралы мәлімет және өтінішке қажет құжаттар керек болады. Құжат жүктеу модулін келесі кезеңде қосамыз.",
      maintenance: "Техникалық мәселені «Техникалық өтініштер» бөлімінен жіберуге болады. Кейін ML моделі өтініш санатын және басымдығын автоматты анықтайды.",
      default: "Мен SmartDorm демо-көмекшісімін. Бос орын, өтініш, құжаттар немесе техникалық мәселе туралы сұрап көріңіз."
    },
    ru: {
      vacancy: "Свободные места показываются в разделе «Общежития». Сейчас числа демонстрационные; позже они будут связаны с реальной базой.",
      apply: "Для подачи заявки откройте раздел «Мои заявки». Полный функционал будет добавлен на следующем этапе.",
      docs: "Обычно нужны данные профиля студента, сведения об университете и документы для заявки. Модуль загрузки документов добавим далее.",
      maintenance: "Техническую проблему можно отправить в разделе «Тех. заявки». Позже ML-модель будет автоматически определять категорию и приоритет.",
      default: "Я демо-помощник SmartDorm. Спросите о свободных местах, заявке, документах или технической проблеме."
    },
    en: {
      vacancy: "Available places are shown in the Dormitories section. Current numbers are demo data and will later be connected to the live database.",
      apply: "Open My applications to submit a dormitory application. Full application functionality will be added in the next stage.",
      docs: "A student profile, university details and application documents are typically required. Document upload will be added next.",
      maintenance: "You can report a technical issue in Maintenance. Later an ML model will classify the category and priority automatically.",
      default: "I am the SmartDorm demo assistant. Ask about availability, applications, documents or maintenance."
    }
  };

  const r = replies[lang];
  let reply;
  if (/бос|свобод|vacan|place|орын/.test(lower)) reply = r.vacancy;
  else if (/өтініш|заяв|apply|application/.test(lower)) reply = r.apply;
  else if (/құжат|документ|document/.test(lower)) reply = r.docs;
  else if (/жөндеу|ремонт|maintenance|сын|слом|problem|тех/.test(lower)) reply = r.maintenance;
  else reply = r.default;

  db.data.chatMessages.push({
    id: nextId(db.data.chatMessages),
    userId: req.userId,
    message,
    reply,
    language: lang,
    createdAt: new Date().toISOString()
  });
  await persist();

  res.json({ reply });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, database: "lowdb-json", city: "Almaty" });
});

app.listen(PORT, () => {
  console.log(`SmartDorm API: http://localhost:${PORT}`);
});
