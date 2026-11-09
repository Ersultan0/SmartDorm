import express from "express";
import jwt from "jsonwebtoken";
import pool from "./db.js";

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "smartdorm-local-development-secret-change-later";


function staffAuth(req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!["admin", "staff"].includes(payload.role)) {
      return res.status(403).json({
        message: "Staff access required",
      });
    }

    req.userId = Number(payload.sub);
    req.userRole = payload.role;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}


async function logAction(
  actorId,
  action,
  targetUserId = null,
  details = null
) {
  await pool.query(
    `
    INSERT INTO activity_logs
    (actor_id, action, target_user_id, details)
    VALUES ($1, $2, $3, $4)
    `,
    [actorId, action, targetUserId, details]
  );
}


/* ===============================
   DASHBOARD STATISTICS
================================ */

router.get("/stats", staffAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT

      (
        SELECT COUNT(*)
        FROM users
        WHERE role = 'student'
      ) AS total_students,

      (
        SELECT COUNT(*)
        FROM users
        WHERE role = 'student'
        AND is_blocked = FALSE
      ) AS active_students,

      (
        SELECT COUNT(*)
        FROM users
        WHERE role = 'student'
        AND is_blocked = TRUE
      ) AS blocked_students,

      (
        SELECT COUNT(*)
        FROM users
        WHERE role IN ('admin', 'staff')
      ) AS total_staff,

      (
        SELECT COUNT(*)
        FROM dormitories
      ) AS total_dormitories,

      (
        SELECT COALESCE(SUM(total_places), 0)
        FROM dormitories
      ) AS total_places,

      (
        SELECT COALESCE(SUM(occupied_places), 0)
        FROM dormitories
      ) AS occupied_places,

      (
        SELECT COALESCE(
          SUM(total_places - occupied_places),
          0
        )
        FROM dormitories
      ) AS available_places,

      (
        SELECT COUNT(*)
        FROM applications
        WHERE status = 'pending'
      ) AS pending_applications,

      (
        SELECT COUNT(*)
        FROM applications
        WHERE status = 'approved'
      ) AS approved_applications,

      (
        SELECT COUNT(*)
        FROM applications
        WHERE status = 'rejected'
      ) AS rejected_applications,

      (
        SELECT COUNT(*)
        FROM maintenance_requests
        WHERE status != 'completed'
      ) AS open_maintenance
    `);

    return res.json({
      stats: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to load statistics",
    });
  }
});


/* ===============================
   STUDENT LIST
================================ */

router.get("/users", staffAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "")
      .trim()
      .toLowerCase();

    const status = String(req.query.status || "all");

    const university = String(
      req.query.university || ""
    ).trim();

    const values = [];
    const conditions = [
      "u.role = 'student'"
    ];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          LOWER(u.full_name) LIKE $${values.length}
          OR LOWER(u.email) LIKE $${values.length}
          OR LOWER(u.phone) LIKE $${values.length}
        )
      `);
    }

    if (status === "active") {
      conditions.push("u.is_blocked = FALSE");
    }

    if (status === "blocked") {
      conditions.push("u.is_blocked = TRUE");
    }

    if (university) {
      values.push(university);

      conditions.push(
        `sp.university = $${values.length}`
      );
    }

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.city,
        u.is_blocked,
        u.block_reason,
        u.created_at,
        u.last_login_at,

        sp.university,
        sp.faculty,
        sp.course

      FROM users u

      LEFT JOIN student_profiles sp
        ON sp.user_id = u.id

      WHERE ${conditions.join(" AND ")}

      ORDER BY u.created_at DESC
      `,
      values
    );

    return res.json({
      users: result.rows,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to load students",
    });
  }
});


/* ===============================
   ONE STUDENT DETAILS
================================ */

router.get(
  "/users/:id",
  staffAuth,
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      const userResult = await pool.query(
        `
        SELECT
          u.id,
          u.role,
          u.full_name,
          u.email,
          u.phone,
          u.city,
          u.is_blocked,
          u.blocked_at,
          u.block_reason,
          u.created_at,
          u.last_login_at,

          sp.university,
          sp.faculty,
          sp.course

        FROM users u

        LEFT JOIN student_profiles sp
          ON sp.user_id = u.id

        WHERE u.id = $1
        `,
        [userId]
      );

      if (!userResult.rows.length) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      const applications =
        await pool.query(
          `
          SELECT
            a.*,
            d.name AS dormitory_name
          FROM applications a

          LEFT JOIN dormitories d
            ON d.id = a.dormitory_id

          WHERE a.user_id = $1

          ORDER BY a.created_at DESC
          `,
          [userId]
        );

      const maintenance =
        await pool.query(
          `
          SELECT *
          FROM maintenance_requests
          WHERE user_id = $1
          ORDER BY created_at DESC
          `,
          [userId]
        );

      const blockHistory =
        await pool.query(
          `
          SELECT
            ub.*,
            admin.full_name AS blocked_by_name

          FROM user_blocks ub

          LEFT JOIN users admin
            ON admin.id = ub.blocked_by

          WHERE ub.user_id = $1

          ORDER BY ub.blocked_at DESC
          `,
          [userId]
        );

      return res.json({
        user: userResult.rows[0],
        applications: applications.rows,
        maintenance: maintenance.rows,
        blockHistory: blockHistory.rows,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        message: "Failed to load student",
      });
    }
  }
);


/* ===============================
   BLOCK STUDENT
================================ */

router.post(
  "/users/:id/block",
  staffAuth,
  async (req, res) => {
    const userId = Number(req.params.id);

    const reason = String(
      req.body?.reason || ""
    ).trim();

    if (!reason) {
      return res.status(400).json({
        message: "Block reason is required",
      });
    }

    if (userId === req.userId) {
      return res.status(400).json({
        message: "You cannot block yourself",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const target =
        await client.query(
          `
          SELECT id, role, full_name
          FROM users
          WHERE id = $1
          `,
          [userId]
        );

      if (!target.rows.length) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "User not found",
        });
      }

      if (target.rows[0].role !== "student") {
        await client.query("ROLLBACK");

        return res.status(403).json({
          message:
            "Only student accounts can be blocked here",
        });
      }

      await client.query(
        `
        UPDATE users
        SET
          is_blocked = TRUE,
          blocked_at = NOW(),
          blocked_by = $1,
          block_reason = $2
        WHERE id = $3
        `,
        [
          req.userId,
          reason,
          userId
        ]
      );

      await client.query(
        `
        UPDATE user_blocks
        SET
          active = FALSE,
          unblocked_at = NOW()
        WHERE user_id = $1
        AND active = TRUE
        `,
        [userId]
      );

      await client.query(
        `
        INSERT INTO user_blocks
        (
          user_id,
          blocked_by,
          reason,
          active
        )
        VALUES ($1, $2, $3, TRUE)
        `,
        [
          userId,
          req.userId,
          reason
        ]
      );

      await client.query(
        `
        INSERT INTO activity_logs
        (
          actor_id,
          action,
          target_user_id,
          details
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          req.userId,
          "BLOCK_USER",
          userId,
          reason
        ]
      );

      await client.query("COMMIT");

      return res.json({
        ok: true,
        message: "Student blocked",
      });
    } catch (err) {
      await client.query("ROLLBACK");

      console.error(err);

      return res.status(500).json({
        message: "Failed to block student",
      });
    } finally {
      client.release();
    }
  }
);


/* ===============================
   UNBLOCK STUDENT
================================ */

router.post(
  "/users/:id/unblock",
  staffAuth,
  async (req, res) => {
    const userId = Number(req.params.id);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        UPDATE users
        SET
          is_blocked = FALSE,
          blocked_at = NULL,
          blocked_by = NULL,
          block_reason = NULL
        WHERE id = $1
        `,
        [userId]
      );

      await client.query(
        `
        UPDATE user_blocks
        SET
          active = FALSE,
          unblocked_at = NOW()
        WHERE user_id = $1
        AND active = TRUE
        `,
        [userId]
      );

      await client.query(
        `
        INSERT INTO activity_logs
        (
          actor_id,
          action,
          target_user_id,
          details
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          req.userId,
          "UNBLOCK_USER",
          userId,
          "Student account unblocked"
        ]
      );

      await client.query("COMMIT");

      return res.json({
        ok: true,
        message: "Student unblocked",
      });
    } catch (err) {
      await client.query("ROLLBACK");

      console.error(err);

      return res.status(500).json({
        message: "Failed to unblock student",
      });
    } finally {
      client.release();
    }
  }
);


/* ===============================
   ACTIVITY LOGS
================================ */

router.get(
  "/activity",
  staffAuth,
  async (req, res) => {
    try {
      const result =
        await pool.query(`
          SELECT
            al.id,
            al.action,
            al.details,
            al.created_at,

            actor.full_name AS actor_name,
            target.full_name AS target_name

          FROM activity_logs al

          LEFT JOIN users actor
            ON actor.id = al.actor_id

          LEFT JOIN users target
            ON target.id = al.target_user_id

          ORDER BY al.created_at DESC

          LIMIT 100
        `);

      return res.json({
        activity: result.rows,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        message: "Failed to load activity",
      });
    }
  }
);

export default router;