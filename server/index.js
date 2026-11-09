import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { randomInt } from "crypto";

import pool, { initDatabase } from "./db.js";
import staffRouter from "./staff.js";
const app = express();

const PORT = process.env.PORT || 4000;
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "smartdorm-local-development-secret-change-later";

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_APP_PASSWORD,
  },
});
app.use(cors());
app.use(express.json());
app.use("/api/staff", staffRouter);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRe = /^\+7 7\d{2} \d{3} \d{2} \d{2}$/;

const nameRe =
  /^[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё'’.-]+(?:\s+[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё'’.-]+)+$/u;

const passwordRe =
  /^(?=.*[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё])(?=.*\d).{8,}$/u;

function error(res, status, message, field = null) {
  return res.status(status).json({
    message,
    field,
  });
}

async function loadUser(id) {
  const userResult = await pool.query(
    `
    SELECT
      id,
      role,
      full_name,
      email,
      phone,
      city,
      is_blocked,
      block_reason,
      blocked_at,
      last_login_at,
      created_at
    FROM users
    WHERE id = $1
    `,
    [id]
  );

  if (!userResult.rows.length) {
    return null;
  }

  const row = userResult.rows[0];

  const safeUser = {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    city: row.city,

    isBlocked: row.is_blocked,
    blockReason: row.block_reason,
    blockedAt: row.blocked_at,
    lastLoginAt: row.last_login_at,

    createdAt: row.created_at,
  };

  if (row.role === "student") {
    const profileResult = await pool.query(
      `
      SELECT
        university,
        faculty,
        course
      FROM student_profiles
      WHERE user_id = $1
      `,
      [id]
    );

    const profile = profileResult.rows[0] || {};

    return {
      ...safeUser,
      university: profile.university,
      faculty: profile.faculty,
      course: profile.course,
    };
  }

  if (row.role === "admin" || row.role === "staff") {
    const profileResult = await pool.query(
      `
      SELECT
        position,
        organization_type,
        university,
        dormitory_name,
        dormitory_address
      FROM admin_profiles
      WHERE user_id = $1
      `,
      [id]
    );

    const profile = profileResult.rows[0] || {};

    return {
      ...safeUser,
      position: profile.position,
      organizationType: profile.organization_type,
      university: profile.university,
      dormitoryName: profile.dormitory_name,
      dormitoryAddress: profile.dormitory_address,
    };
  }

  return safeUser;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "SmartDorm API",
    message: "SmartDorm backend is running",
  });
});
  app.post("/api/auth/send-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email || !emailRe.test(email)) {
      return error(
        res,
        400,
        "Invalid email format",
        "email"
      );
    }

    // Бұл email бұрын тіркелген бе?
    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
      `,
      [email]
    );

    if (existingUser.rows.length) {
      return error(
        res,
        409,
        "This email is already registered",
        "email"
      );
    }

    // 100000 - 999999 аралығындағы 6 таңбалы код
    const code = String(
      randomInt(100000, 1000000)
    );

    // Кодты ашық түрде базаға сақтамаймыз
    const codeHash = await bcrypt.hash(code, 10);

    // Код 10 минут жұмыс істейді
    const expiresAt =
      new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO email_verifications
      (
        email,
        code_hash,
        expires_at,
        verified
      )
      VALUES ($1, $2, $3, FALSE)

      ON CONFLICT (email)

      DO UPDATE SET
        code_hash = EXCLUDED.code_hash,
        expires_at = EXCLUDED.expires_at,
        verified = FALSE,
        created_at = CURRENT_TIMESTAMP
      `,
      [
        email,
        codeHash,
        expiresAt
      ]
    );

    await mailTransporter.sendMail({
      from: `"SmartDorm" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "SmartDorm verification code",

      text: `
Your SmartDorm verification code is: ${code}

This code expires in 10 minutes.

Do not share this code with anyone.
      `,

      html: `
        <div style="
          font-family:Arial,sans-serif;
          max-width:500px;
          margin:auto;
          padding:30px;
        ">
          <h2 style="color:#16734e;">
            SmartDorm
          </h2>

          <p>
            Your verification code:
          </p>

          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            padding:18px;
            background:#f2f7f4;
            border-radius:10px;
            text-align:center;
          ">
            ${code}
          </div>

          <p>
            This code expires in 10 minutes.
          </p>

          <small>
            Do not share this code with anyone.
          </small>
        </div>
      `,
    });

    return res.json({
      ok: true,
      message: "Verification code sent"
    });

  } catch (err) {
    console.error("SEND CODE ERROR:", err);

    return res.status(500).json({
      message: "Verification code could not be sent"
    });
  }
});
app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    const code = String(req.body?.code || "")
      .trim();

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and code are required"
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "Code must contain 6 digits"
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM email_verifications
      WHERE email = $1
      `,
      [email]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        message: "Verification code not found"
      });
    }

    const verification = result.rows[0];

    if (
      new Date(verification.expires_at) <
      new Date()
    ) {
      return res.status(400).json({
        message: "Verification code has expired"
      });
    }

    const correct = await bcrypt.compare(
      code,
      verification.code_hash
    );

    if (!correct) {
      return res.status(400).json({
        message: "Incorrect verification code"
      });
    }

    await pool.query(
      `
      UPDATE email_verifications
      SET verified = TRUE
      WHERE email = $1
      `,
      [email]
    );

    return res.json({
      ok: true,
      verified: true,
      message: "Email verified"
    });

  } catch (err) {
    console.error("VERIFY CODE ERROR:", err);

    return res.status(500).json({
      message: "Verification failed"
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};

  const {
    role,
    fullName,
    email,
    phone,
    password,
    university,
    faculty,
    course,
    position,
    organizationType,
    dormitoryName,
    dormitoryAddress,
  } = body;

  if (!["student", "admin"].includes(role)) {
    return error(res, 400, "Invalid role", "role");
  }

  if (!fullName || !nameRe.test(fullName.trim())) {
    return error(
      res,
      400,
      "Full name must contain at least two words",
      "fullName"
    );
  }

  if (!email || !emailRe.test(email.trim())) {
    return error(res, 400, "Invalid email format", "email");
  }

  if (!phone || !phoneRe.test(phone)) {
    return error(
      res,
      400,
      "Phone format must be +7 777 123 45 67",
      "phone"
    );
  }

  if (!password || !passwordRe.test(password)) {
    return error(
      res,
      400,
      "Password must be at least 8 characters and contain a letter and a number",
      "password"
    );
  }

  if (role === "student") {
    if (!university) {
      return error(res, 400, "University is required", "university");
    }

    if (!faculty || faculty.trim().length < 2) {
      return error(
        res,
        400,
        "Faculty / major is required",
        "faculty"
      );
    }

    if (![1, 2, 3, 4, 5, 6].includes(Number(course))) {
      return error(res, 400, "Invalid year of study", "course");
    }
  }

  if (role === "admin") {
    if (!["university", "private"].includes(organizationType)) {
      return error(
        res,
        400,
        "Organization type is required",
        "organizationType"
      );
    }

    if (organizationType === "university" && !university) {
      return error(
        res,
        400,
        "University is required",
        "university"
      );
    }

    if (!position || position.trim().length < 2) {
      return error(res, 400, "Position is required", "position");
    }

    if (!dormitoryName || dormitoryName.trim().length < 3) {
      return error(
        res,
        400,
        "Dormitory name is required",
        "dormitoryName"
      );
    }

    if (!dormitoryAddress || dormitoryAddress.trim().length < 6) {
      return error(
        res,
        400,
        "Dormitory address is required",
        "dormitoryAddress"
      );
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const verificationResult = await pool.query(
  `
  SELECT verified, expires_at
  FROM email_verifications
  WHERE email = $1
  `,
  [normalizedEmail]
);

if (!verificationResult.rows.length) {
  return error(
    res,
    403,
    "Please verify your email first",
    "email"
  );
}

const verification =
  verificationResult.rows[0];

if (!verification.verified) {
  return error(
    res,
    403,
    "Email is not verified",
    "email"
  );
}

if (
  new Date(verification.expires_at) <
  new Date()
) {
  return error(
    res,
    403,
    "Email verification has expired",
    "email"
  );
}

  const existing = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = $1",
    [normalizedEmail]
  );

  if (existing.rows.length) {
    return error(
      res,
      409,
      "This email is already registered",
      "email"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      INSERT INTO users
      (role, full_name, email, phone, password_hash, city)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        role,
        fullName.trim(),
        normalizedEmail,
        phone,
        passwordHash,
        "Almaty",
      ]
    );

    const userId = userResult.rows[0].id;

    if (role === "student") {
      await client.query(
        `
        INSERT INTO student_profiles
        (user_id, university, faculty, course)
        VALUES ($1, $2, $3, $4)
        `,
        [
          userId,
          university,
          faculty.trim(),
          Number(course),
        ]
      );
    } else {
      await client.query(
        `
        INSERT INTO admin_profiles
        (
          user_id,
          position,
          organization_type,
          university,
          dormitory_name,
          dormitory_address
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          userId,
          position.trim(),
          organizationType,
          organizationType === "university"
            ? university
            : null,
          dormitoryName.trim(),
          dormitoryAddress.trim(),
        ]
      );
    }

    await client.query("COMMIT");

    await pool.query(
  `
  DELETE FROM email_verifications
  WHERE email = $1
  `,
  [normalizedEmail]
);

    return res.status(201).json({
      ok: true,
      userId,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return error(
      res,
      500,
      "Registration failed. Please try again."
    );
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !emailRe.test(email.trim())) {
    return error(res, 400, "Invalid email format", "email");
  }

  if (!password) {
    return error(res, 400, "Password is required", "password");
  }

  const result = await pool.query(
    `
    SELECT
  id,
  role,
  password_hash,
  is_blocked,
  block_reason
FROM users
WHERE LOWER(email) = $1
    `,
    [email.trim().toLowerCase()]
  );

  if (!result.rows.length) {
    return error(res, 401, "Invalid email or password");
  }

  const row = result.rows[0];
  if (row.is_blocked) {
  return res.status(403).json({
    message: "Your SmartDorm account has been blocked.",
    blocked: true,
    reason: row.block_reason,
  });
}

  const ok = await bcrypt.compare(
    password,
    row.password_hash
  );

  if (!ok) {
    return error(res, 401, "Invalid email or password");
  }

  const user = await loadUser(row.id);

  const token = jwt.sign(
    {
      sub: row.id,
      role: row.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  return res.json({
    token,
    user,
  });
});

function auth(req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return error(res, 401, "Unauthorized");
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    req.userId = Number(payload.sub);
    req.userRole = payload.role;

    next();
  } catch {
    return error(
      res,
      401,
      "Invalid or expired token"
    );
  }
}

app.get("/api/me", auth, async (req, res) => {
  try {
    const user = await loadUser(req.userId);

    if (!user) {
      return error(res, 404, "User not found");
    }

    return res.json({
      user,
    });
  } catch (err) {
    console.error(err);

    return error(
      res,
      500,
      "Failed to load user"
    );
  }
});

app.post("/api/chat", auth, async (req, res) => {
  const message = String(
    req.body?.message || ""
  ).trim();

  const lang = ["kk", "ru", "en"].includes(
    req.body?.lang
  )
    ? req.body.lang
    : "kk";

  if (!message) {
    return error(
      res,
      400,
      "Message is required"
    );
  }

  const lower = message.toLowerCase();

  const replies = {
    kk: {
      vacancy:
        "Бос орындар «Жатақханалар» бөлімінде көрсетіледі.",
      apply:
        "Жатақханаға өтініш беру үшін «Менің өтініштерім» бөліміне өтіңіз.",
      docs:
        "Студент профилі, университет мәліметтері және қажетті құжаттар керек болады.",
      maintenance:
        "Техникалық мәселені «Техникалық өтініштер» бөлімінен жіберуге болады.",
      default:
        "Мен SmartDorm көмекшісімін. Бос орын, өтініш, құжаттар немесе техникалық мәселе туралы сұраңыз.",
    },

    ru: {
      vacancy:
        "Свободные места показываются в разделе «Общежития».",
      apply:
        "Для подачи заявки откройте раздел «Мои заявки».",
      docs:
        "Необходимы данные профиля студента, сведения об университете и документы.",
      maintenance:
        "Техническую проблему можно отправить в разделе «Тех. заявки».",
      default:
        "Я помощник SmartDorm. Спросите о свободных местах, заявках, документах или технических проблемах.",
    },

    en: {
      vacancy:
        "Available places are shown in the Dormitories section.",
      apply:
        "Open My Applications to submit a dormitory application.",
      docs:
        "Student profile information, university details and application documents are required.",
      maintenance:
        "You can report a technical issue in the Maintenance section.",
      default:
        "I am the SmartDorm assistant. Ask about availability, applications, documents or maintenance.",
    },
  };

  const r = replies[lang];

  let reply;

  if (/бос|свобод|vacan|place|орын/.test(lower)) {
    reply = r.vacancy;
  } else if (
    /өтініш|заяв|apply|application/.test(lower)
  ) {
    reply = r.apply;
  } else if (
    /құжат|документ|document/.test(lower)
  ) {
    reply = r.docs;
  } else if (
    /жөндеу|ремонт|maintenance|сын|слом|problem|тех/.test(
      lower
    )
  ) {
    reply = r.maintenance;
  } else {
    reply = r.default;
  }

  try {
    await pool.query(
      `
      INSERT INTO chat_messages
      (user_id, message, reply, language)
      VALUES ($1, $2, $3, $4)
      `,
      [
        req.userId,
        message,
        reply,
        lang,
      ]
    );

    return res.json({
      reply,
    });
  } catch (err) {
    console.error(err);

    return error(
      res,
      500,
      "Chat message could not be saved"
    );
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      ok: true,
      database: "postgresql",
      city: "Almaty",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      ok: false,
      database: "disconnected",
    });
  }
});

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `SmartDorm API running on port ${PORT}`
      );
    });
  } catch (err) {
    console.error(
      "Failed to start SmartDorm:",
      err
    );

    process.exit(1);
  }
}

startServer();