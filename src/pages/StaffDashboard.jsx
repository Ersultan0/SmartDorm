import { useEffect, useMemo, useState } from "react";
import {
    Users,
    UserCheck,
    UserX,
    Building2,
    BedDouble,
    ClipboardList,
    Wrench,
    Search,
    ShieldBan,
    ShieldCheck,
    Activity,
    X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";

const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://smartdorm-backend-trzy.onrender.com";

export default function StaffDashboard() {
    const { token, user } = useAuth();

    const [activeTab, setActiveTab] = useState("dashboard");

    const [stats, setStats] = useState(null);
    const [students, setStudents] = useState([]);
    const [activity, setActivity] = useState([]);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [staffForm, setStaffForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        position: "",
        dormitoryName: "",
        dormitoryAddress: ""
    });
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetails, setStudentDetails] = useState(null);

    const [blockReason, setBlockReason] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    const authHeaders = useMemo(
        () => ({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        }),
        [token]
    );

    async function loadStats() {
        try {
            const res = await fetch(`${API_URL}/api/staff/stats`, {
                headers: authHeaders,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Statistics error");
            }

            setStats(data.stats);
        } catch (err) {
            setError(err.message);
        }
    }

    async function loadStudents() {
        try {
            const params = new URLSearchParams();

            if (search.trim()) {
                params.set("search", search.trim());
            }

            if (status !== "all") {
                params.set("status", status);
            }

            const res = await fetch(
                `${API_URL}/api/staff/users?${params.toString()}`,
                {
                    headers: authHeaders,
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Students error");
            }

            setStudents(data.users || []);
        } catch (err) {
            setError(err.message);
        }
    }

    async function loadActivity() {
        try {
            const res = await fetch(`${API_URL}/api/staff/activity`, {
                headers: authHeaders,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Activity error");
            }

            setActivity(data.activity || []);
        } catch (err) {
            setError(err.message);
        }
    }

    async function loadStudentDetails(id) {
        try {
            setActionLoading(true);

            const res = await fetch(`${API_URL}/api/staff/users/${id}`, {
                headers: authHeaders,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Student error");
            }

            setStudentDetails(data);
            setSelectedStudent(id);
            setBlockReason("");
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    }

    async function createStaff(e) {
        e.preventDefault();

        try {
            const res = await fetch(
                `${API_URL}/api/staff/create`,
                {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify(staffForm)
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Staff create error");
            }

            alert("Staff created successfully");

            setStaffForm({
                fullName: "",
                email: "",
                phone: "",
                password: "",
                position: "",
                dormitoryName: "",
                dormitoryAddress: ""
            });

            await loadActivity();

        } catch (err) {
            alert(err.message);
        }
    }
    async function blockStudent() {
        if (!selectedStudent) return;

        if (!blockReason.trim()) {
            alert("Block reason is required");
            return;
        }

        try {
            setActionLoading(true);

            const res = await fetch(
                `${API_URL}/api/staff/users/${selectedStudent}/block`,
                {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({
                        reason: blockReason.trim(),
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Block error");
            }

            await loadStudentDetails(selectedStudent);
            await loadStudents();
            await loadStats();
            await loadActivity();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    }

    async function unblockStudent() {
        if (!selectedStudent) return;

        try {
            setActionLoading(true);

            const res = await fetch(
                `${API_URL}/api/staff/users/${selectedStudent}/unblock`,
                {
                    method: "POST",
                    headers: authHeaders,
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Unblock error");
            }

            await loadStudentDetails(selectedStudent);
            await loadStudents();
            await loadStats();
            await loadActivity();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    }

    useEffect(() => {
        async function start() {
            setLoading(true);
            setError("");

            await Promise.all([
                loadStats(),
                loadStudents(),
                loadActivity(),
            ]);

            setLoading(false);
        }

        if (token) {
            start();
        }
    }, [token]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (token) {
                loadStudents();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search, status]);

    if (loading) {
        return (
            <div className="staff-loading">
                SmartDorm Staff Dashboard loading...
            </div>
        );
    }

    return (
        <div className="staff-layout">
            <aside className="staff-sidebar">
                <div className="staff-logo">
                    <Building2 size={25} />
                    <div>
                        <strong>SmartDorm</strong>
                        <small>Dormitory Staff</small>
                    </div>
                </div>

                <nav>
                    <button
                        className={activeTab === "dashboard" ? "active" : ""}
                        onClick={() => setActiveTab("dashboard")}
                    >
                        <Activity size={18} />
                        Dashboard
                    </button>

                    <button
                        className={activeTab === "students" ? "active" : ""}
                        onClick={() => setActiveTab("students")}
                    >
                        <Users size={18} />
                        Students
                    </button>

                    <button
                        className={activeTab === "staff" ? "active" : ""}
                        onClick={() => setActiveTab("staff")}
                    >
                        <UserCheck size={18} />
                        Staff management
                    </button>

                    <button
                        className={activeTab === "activity" ? "active" : ""}
                        onClick={() => setActiveTab("activity")}
                    >
                        <ClipboardList size={18} />
                        Activity log
                    </button>
                </nav>

                <div className="staff-account">
                    <strong>{user?.fullName}</strong>
                    <span>{user?.role}</span>
                </div>
            </aside>

            <main className="staff-main">
                <header className="staff-header">
                    <div>
                        <h1>
                            {activeTab === "dashboard" && "Dashboard"}
                            {activeTab === "students" && "Students"}
                            {activeTab === "staff" && "Staff management"}
                            {activeTab === "activity" && "Activity log"}
                        </h1>

                        <p>
                            Dormitory management and monitoring
                        </p>
                    </div>
                </header>

                {error && (
                    <div className="staff-error">
                        {error}
                    </div>
                )}

                {activeTab === "dashboard" && (
                    <Dashboard stats={stats} activity={activity} />
                )}

                {activeTab === "students" && (
                    <section>
                        <div className="students-toolbar">
                            <div className="student-search">
                                <Search size={18} />

                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name, email or phone..."
                                />
                            </div>

                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="all">All students</option>
                                <option value="active">Active</option>
                                <option value="blocked">Blocked</option>
                            </select>
                        </div>

                        <div className="staff-table-wrap">
                            <table className="staff-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Student</th>
                                        <th>University</th>
                                        <th>Course</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {students.map((student) => (
                                        <tr key={student.id}>
                                            <td>#{student.id}</td>

                                            <td>
                                                <strong>{student.full_name}</strong>
                                                <small>{student.email}</small>
                                            </td>

                                            <td>
                                                {student.university || "—"}
                                            </td>

                                            <td>
                                                {student.course || "—"}
                                            </td>

                                            <td>
                                                {student.is_blocked ? (
                                                    <span className="status blocked">
                                                        Blocked
                                                    </span>
                                                ) : (
                                                    <span className="status active">
                                                        Active
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                <button
                                                    className="view-student"
                                                    onClick={() =>
                                                        loadStudentDetails(student.id)
                                                    }
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {!students.length && (
                                        <tr>
                                            <td colSpan="6" className="empty-table">
                                                No students found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {activeTab === "staff" && (
                    <section className="staff-section">
                        <h2>Create Dormitory Staff</h2>

                        {user?.role !== "admin" ? (
                            <p>
                                Only administrator can create staff accounts.
                            </p>
                        ) : (
                            <form
                                onSubmit={createStaff}
                                className="staff-create-form"
                            >
                                <input
                                    placeholder="Full name"
                                    value={staffForm.fullName}
                                    onChange={(e) =>
                                        setStaffForm({
                                            ...staffForm,
                                            fullName: e.target.value
                                        })
                                    }
                                />

                                <input
                                    placeholder="Email"
                                    type="email"
                                    value={staffForm.email}
                                    onChange={(e) =>
                                        setStaffForm({
                                            ...staffForm,
                                            email: e.target.value
                                        })
                                    }
                                />

                                <input
                                    placeholder="Phone"
                                    value={staffForm.phone}
                                    onChange={(e) =>
                                        setStaffForm({
                                            ...staffForm,
                                            phone: e.target.value
                                        })
                                    }
                                />

                                <input
                                    placeholder="Password"
                                    type="password"
                                    value={staffForm.password}
                                    onChange={(e) =>
                                        setStaffForm({
                                            ...staffForm,
                                            password: e.target.value
                                        })
                                    }
                                />

                                <input
                                    placeholder="Position"
                                    value={staffForm.position}
                                    onChange={(e) =>
                                        setStaffForm({
                                            ...staffForm,
                                            position: e.target.value
                                        })
                                    }
                                />

                                <input
                                    placeholder="Dormitory name"
                                    value={staffForm.dormitoryName}
                                    onChange={(e) =>
                                        setStaffForm({
                                            ...staffForm,
                                            dormitoryName: e.target.value
                                        })
                                    }
                                />

                                <input
                                    placeholder="Dormitory address"
                                    value={staffForm.dormitoryAddress}
                                    onChange={(e) =>
                                        setStaffForm({
                                            ...staffForm,
                                            dormitoryAddress: e.target.value
                                        })
                                    }
                                />

                                <button type="submit">
                                    Create Staff
                                </button>
                            </form>
                        )}
                    </section>
                )}

                {activeTab === "activity" && (
                    <ActivityList activity={activity} />
                )}
            </main>

            {selectedStudent && studentDetails && (
                <StudentModal
                    data={studentDetails}
                    reason={blockReason}
                    setReason={setBlockReason}
                    loading={actionLoading}
                    onClose={() => {
                        setSelectedStudent(null);
                        setStudentDetails(null);
                    }}
                    onBlock={blockStudent}
                    onUnblock={unblockStudent}
                />
            )}
        </div>
    );
}

function Dashboard({ stats, activity }) {
    const cards = [
        {
            title: "Total students",
            value: stats?.total_students || 0,
            icon: <Users />,
        },
        {
            title: "Active students",
            value: stats?.active_students || 0,
            icon: <UserCheck />,
        },
        {
            title: "Blocked",
            value: stats?.blocked_students || 0,
            icon: <UserX />,
        },
        {
            title: "Dormitories",
            value: stats?.total_dormitories || 0,
            icon: <Building2 />,
        },
        {
            title: "Total places",
            value: stats?.total_places || 0,
            icon: <BedDouble />,
        },
        {
            title: "Available places",
            value: stats?.available_places || 0,
            icon: <BedDouble />,
        },
        {
            title: "Pending applications",
            value: stats?.pending_applications || 0,
            icon: <ClipboardList />,
        },
        {
            title: "Maintenance",
            value: stats?.open_maintenance || 0,
            icon: <Wrench />,
        },
    ];

    return (
        <>
            <div className="staff-stat-grid">
                {cards.map((card) => (
                    <div className="staff-stat-card" key={card.title}>
                        <span>{card.icon}</span>

                        <div>
                            <small>{card.title}</small>
                            <strong>{card.value}</strong>
                        </div>
                    </div>
                ))}
            </div>

            <div className="staff-section">
                <h2>Recent activity</h2>

                <ActivityList activity={activity.slice(0, 8)} />
            </div>
        </>
    );
}

function ActivityList({ activity }) {
    return (
        <div className="activity-list">
            {activity.map((item) => (
                <div className="activity-row" key={item.id}>
                    <div>
                        <strong>
                            {item.actor_name || "System"}
                        </strong>

                        <p>
                            {formatAction(item.action)}
                            {item.target_name
                                ? ` — ${item.target_name}`
                                : ""}
                        </p>

                        {item.details && (
                            <small>{item.details}</small>
                        )}
                    </div>

                    <time>
                        {formatDate(item.created_at)}
                    </time>
                </div>
            ))}

            {!activity.length && (
                <div className="empty-activity">
                    No activity yet.
                </div>
            )}
        </div>
    );
}

function StudentModal({
    data,
    reason,
    setReason,
    loading,
    onClose,
    onBlock,
    onUnblock,
}) {
    const user = data.user;

    return (
        <div className="student-modal-backdrop">
            <div className="student-modal">
                <button
                    className="student-modal-close"
                    onClick={onClose}
                >
                    <X />
                </button>

                <div className="student-modal-title">
                    <div>
                        <h2>{user.full_name}</h2>
                        <p>Student #{user.id}</p>
                    </div>

                    {user.is_blocked ? (
                        <span className="status blocked">
                            Blocked
                        </span>
                    ) : (
                        <span className="status active">
                            Active
                        </span>
                    )}
                </div>

                <div className="student-info-grid">
                    <Info label="Email" value={user.email} />
                    <Info label="Phone" value={user.phone} />
                    <Info
                        label="University"
                        value={user.university}
                    />
                    <Info label="Faculty" value={user.faculty} />
                    <Info label="Course" value={user.course} />
                    <Info label="City" value={user.city} />

                    <Info
                        label="Registered"
                        value={formatDate(user.created_at)}
                    />

                    <Info
                        label="Last login"
                        value={
                            user.last_login_at
                                ? formatDate(user.last_login_at)
                                : "Never"
                        }
                    />
                </div>

                {user.is_blocked && (
                    <div className="blocked-information">
                        <strong>Block reason</strong>
                        <p>{user.block_reason}</p>

                        <small>
                            {user.blocked_at
                                ? formatDate(user.blocked_at)
                                : ""}
                        </small>
                    </div>
                )}

                <div className="student-history">
                    <h3>Applications</h3>

                    {data.applications?.map((item) => (
                        <div className="history-item" key={item.id}>
                            <span>Application #{item.id}</span>
                            <strong>{item.status}</strong>
                        </div>
                    ))}

                    {!data.applications?.length && (
                        <p className="empty-text">
                            No applications.
                        </p>
                    )}
                </div>

                <div className="student-history">
                    <h3>Maintenance requests</h3>

                    {data.maintenance?.map((item) => (
                        <div className="history-item" key={item.id}>
                            <span>
                                {item.title || `Request #${item.id}`}
                            </span>

                            <strong>{item.status}</strong>
                        </div>
                    ))}

                    {!data.maintenance?.length && (
                        <p className="empty-text">
                            No maintenance requests.
                        </p>
                    )}
                </div>

                <div className="student-block-area">
                    {!user.is_blocked ? (
                        <>
                            <textarea
                                value={reason}
                                onChange={(e) =>
                                    setReason(e.target.value)
                                }
                                placeholder="Reason for blocking..."
                            />

                            <button
                                className="block-button"
                                onClick={onBlock}
                                disabled={loading}
                            >
                                <ShieldBan size={18} />

                                {loading
                                    ? "Please wait..."
                                    : "Block student"}
                            </button>
                        </>
                    ) : (
                        <button
                            className="unblock-button"
                            onClick={onUnblock}
                            disabled={loading}
                        >
                            <ShieldCheck size={18} />

                            {loading
                                ? "Please wait..."
                                : "Unblock student"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="student-info-item">
            <small>{label}</small>
            <strong>{value || "—"}</strong>
        </div>
    );
}

function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString();
}

function formatAction(action) {
    if (action === "BLOCK_USER") {
        return "Blocked student";
    }

    if (action === "UNBLOCK_USER") {
        return "Unblocked student";
    }

    return action;
}
