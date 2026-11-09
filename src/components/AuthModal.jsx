import { useMemo, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, GraduationCap, Hotel, UserCog, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ALMATY_UNIVERSITIES } from "../data/universities.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://smartdorm-backend-trzy.onrender.com";

const initialStudent = {
  fullName: "", email: "", phone: "", university: "", faculty: "", course: "",
  password: "", confirmPassword: "", agree: false
};

const initialAdmin = {
  fullName: "", email: "", phone: "", position: "", organizationType: "",
  university: "", dormitoryName: "", dormitoryAddress: "",
  password: "", confirmPassword: "", agree: false
};

function formatPhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (!digits.startsWith("7")) digits = "7" + digits;
  digits = digits.slice(0, 11);
  const p1 = digits.slice(1, 4);
  const p2 = digits.slice(4, 7);
  const p3 = digits.slice(7, 9);
  const p4 = digits.slice(9, 11);
  let out = "+7";
  if (p1) out += " " + p1;
  if (p2) out += " " + p2;
  if (p3) out += " " + p3;
  if (p4) out += " " + p4;
  return out;
}

export default function AuthModal({ mode, onClose, onSwitch }) {
  const { t, lang } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [adminTypeChosen, setAdminTypeChosen] = useState(false);
  const [student, setStudent] = useState(initialStudent);
  const [admin, setAdmin] = useState(initialAdmin);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);

  const current = role === "student" ? student : admin;

  const validate = () => {
    const data = current;
    const e = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^\+7 7\d{2} \d{3} \d{2} \d{2}$/;
    const fullNameRe = /^[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё'’.-]+(?:\s+[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё'’.-]+)+$/;
    const passwordRe = /^(?=.*[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё])(?=.*\d).{8,}$/;

    if (!data.fullName.trim()) e.fullName = t.required;
    else if (!fullNameRe.test(data.fullName.trim())) e.fullName = t.invalidName;
    if (!data.email.trim()) e.email = t.required;
    else if (!emailRe.test(data.email.trim())) e.email = t.invalidEmail;
    if (!data.phone.trim()) e.phone = t.required;
    else if (!phoneRe.test(data.phone)) e.phone = t.invalidPhone;
    if (!data.password) e.password = t.required;
    else if (!passwordRe.test(data.password)) e.password = t.weakPassword;
    if (!data.confirmPassword) e.confirmPassword = t.required;
    else if (data.password !== data.confirmPassword) e.confirmPassword = t.mismatch;
    if (!data.agree) e.agree = t.mustAgree;

    if (role === "student") {
      if (!data.university) e.university = t.chooseUniversity;
      if (!data.faculty.trim() || data.faculty.trim().length < 2) e.faculty = t.invalidFaculty;
      if (!data.course) e.course = t.required;
    }

    if (role === "admin") {
      if (!data.position.trim() || data.position.trim().length < 2) e.position = t.invalidPosition;
      if (!data.organizationType) e.organizationType = t.required;
      if (data.organizationType === "university" && !data.university) e.university = t.chooseUniversity;
      if (!data.dormitoryName.trim() || data.dormitoryName.trim().length < 3) e.dormitoryName = t.invalidDorm;
      if (!data.dormitoryAddress.trim() || data.dormitoryAddress.trim().length < 6) e.dormitoryAddress = t.invalidAddress;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const updateStudent = (key, value) => {
    setStudent((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const updateAdmin = (key, value) => {
    setAdmin((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  async function sendVerificationCode() {
    const email = current.email.trim().toLowerCase();

    if (!email) {
      setErrors((prev) => ({
        ...prev,
        email: "Email is required"
      }));
      return;
    }

    try {
      setCodeBusy(true);
      setServerError("");

      const res = await fetch(
        `${API_URL}/api/auth/send-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Code could not be sent"
        );
      }

      setCodeSent(true);
      setEmailVerified(false);
      setVerificationCode("");

      alert("Verification code sent to your email.");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setCodeBusy(false);
    }
  }

  async function verifyEmailCode() {
    const email = current.email.trim().toLowerCase();

    if (verificationCode.length !== 6) {
      setServerError("Enter the 6-digit verification code.");
      return;
    }

    try {
      setCodeBusy(true);
      setServerError("");

      const res = await fetch(
        `${API_URL}/api/auth/verify-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            code: verificationCode
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Verification failed"
        );
      }

      setEmailVerified(true);

      alert("Email verified successfully.");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setCodeBusy(false);
    }
  }
  const submitRegistration = async (event) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const data = role === "student" ? student : admin;
      const payload = {
        role,
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone,
        password: data.password,
        ...(role === "student"
          ? {
            university: data.university,
            faculty: data.faculty.trim(),
            course: data.course
          }
          : {
            position: data.position.trim(),
            organizationType: data.organizationType,
            university: data.organizationType === "university" ? data.university : null,
            dormitoryName: data.dormitoryName.trim(),
            dormitoryAddress: data.dormitoryAddress.trim()
          })
      };

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.field) setErrors((prev) => ({ ...prev, [result.field]: result.message }));
        else setServerError(result.message || "Error");
        return;
      }
      setSuccess(true);
      setTimeout(() => onSwitch("login"), 1500);
    } catch {
      setServerError("Server is not available. Make sure npm run dev is running.");
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    const e = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!loginData.email) e.loginEmail = t.required;
    else if (!emailRe.test(loginData.email)) e.loginEmail = t.invalidEmail;
    if (!loginData.password) e.loginPassword = t.required;
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    setServerError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({
          email: loginData.email.trim().toLowerCase(),
          password: loginData.password
        })
      });
      const result = await res.json();
      if (!res.ok) {
        setServerError(result.message || t.invalidLogin);
        return;
      }
      login(result.token, result.user);
      onClose();

      if (result.user.role === "admin" || result.user.role === "staff") {
        navigate("/staff");
      } else {
        navigate("/portal");
      }
    } catch {
      setServerError("SmartDorm server is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = (name) => `field-control ${errors[name] ? "invalid" : ""}`;

  const RoleCard = ({ value, icon, title, description }) => (
    <button
      type="button"
      className={`role-card ${role === value ? "selected" : ""}`}
      onClick={() => {
        setRole(value);
        setErrors({});
        if (value === "student") setAdminTypeChosen(false);
      }}
    >
      <span className="role-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{description}</small>
    </button>
  );

  if (mode === "login") {
    return (
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div className="auth-modal login-modal" onMouseDown={(e) => e.stopPropagation()}>
          <button className="modal-x" onClick={onClose}><X size={20} /></button>
          <div className="modal-brand"><Building2 size={20} /><strong>SmartDorm</strong></div>
          <h2>{t.loginTitle}</h2>
          <p className="modal-intro">{t.loginText}</p>

          <form onSubmit={submitLogin} noValidate>
            <Field label={t.email} error={errors.email}>
              <input
                className={fieldClass("email")}
                type="email"
                value={current.email}
                onChange={(e) => {
                  const value = e.target.value;

                  if (role === "student") {
                    updateStudent("email", value);
                  } else {
                    updateAdmin("email", value);
                  }

                  setEmailVerified(false);
                  setCodeSent(false);
                  setVerificationCode("");
                }}
                placeholder="name@example.kz"
              />
            </Field>
            <div className="verification-box">
              <button
                type="button"
                className="verification-send-button"
                onClick={sendVerificationCode}
                disabled={codeBusy || emailVerified}
              >
                {emailVerified
                  ? "Email verified"
                  : codeBusy
                    ? "Sending..."
                    : "Send verification code"}
              </button>

              {codeSent && !emailVerified && (
                <div className="verification-code-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={verifyEmailCode}
                    disabled={
                      codeBusy ||
                      verificationCode.length !== 6
                    }
                  >
                    {codeBusy ? "..." : "Verify"}
                  </button>
                </div>
              )}

              {emailVerified && (
                <div className="email-verified-text">
                  ✓ Email verified
                </div>
              )}
            </div>
            <Field label={t.password} error={errors.loginPassword}>
              <div className="password-wrap">
                <input
                  className={fieldClass("loginPassword")}
                  type={showPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </Field>
            {serverError && <div className="form-alert error">{serverError}</div>}
            <button className="submit-button" disabled={busy}>{busy ? "..." : t.signIn}</button>
          </form>

          <p className="switch-auth">{t.noAccount} <button onClick={() => onSwitch("register")}>{t.register}</button></p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="auth-modal register-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}><X size={20} /></button>
        <div className="modal-brand"><Building2 size={20} /><strong>SmartDorm</strong></div>

        {success ? (
          <div className="success-state">
            <span><CheckCircle2 size={38} /></span>
            <h2>{t.success}</h2>
            <p>{t.redirect}</p>
          </div>
        ) : !role ? (
          <>
            <h2>{t.chooseRole}</h2>
            <div className="role-grid">
              <RoleCard value="student" icon={<GraduationCap />} title={t.student} description={t.studentDesc} />
              <RoleCard value="admin" icon={<UserCog />} title={t.administrator} description={t.adminDesc} />
            </div>
            <p className="role-hint">{t.roleFirst}</p>
          </>
        ) : role === "admin" && !adminTypeChosen ? (
          <>
            <button className="step-back" onClick={() => setRole("")}><ArrowLeft size={16} /> {t.back}</button>
            <h2>{t.chooseAdminType}</h2>
            <div className="role-grid">
              <button
                className={`role-card ${admin.organizationType === "university" ? "selected" : ""}`}
                onClick={() => setAdmin((p) => ({ ...p, organizationType: "university" }))}
              >
                <span className="role-icon"><Building2 /></span>
                <strong>{t.universityDorm}</strong>
                <small>{t.universityDormDesc}</small>
              </button>
              <button
                className={`role-card ${admin.organizationType === "private" ? "selected" : ""}`}
                onClick={() => setAdmin((p) => ({ ...p, organizationType: "private", university: "" }))}
              >
                <span className="role-icon"><Hotel /></span>
                <strong>{t.privateDorm}</strong>
                <small>{t.privateDormDesc}</small>
              </button>
            </div>
            <button
              className="submit-button spaced"
              disabled={!admin.organizationType}
              onClick={() => setAdminTypeChosen(true)}
            >
              {t.continue}
            </button>
          </>
        ) : (
          <>
            <button
              className="step-back"
              onClick={() => role === "admin" ? setAdminTypeChosen(false) : setRole("")}
            >
              <ArrowLeft size={16} /> {t.back}
            </button>
            <h2>{role === "student" ? t.student : t.administrator}</h2>
            <p className="modal-intro">Almaty • SmartDorm</p>

            <form onSubmit={submitRegistration} noValidate>
              <div className="form-grid">
                <Field label={t.fullName} error={errors.fullName}>
                  <input className={fieldClass("fullName")} value={current.fullName} onChange={(e) => role === "student" ? updateStudent("fullName", e.target.value) : updateAdmin("fullName", e.target.value)} />
                </Field>

                <Field label={t.email} error={errors.email}>
                  <input className={fieldClass("email")} type="email" value={current.email} onChange={(e) => role === "student" ? updateStudent("email", e.target.value) : updateAdmin("email", e.target.value)} placeholder="name@example.kz" />
                </Field>

                <Field label={t.phone} error={errors.phone}>
                  <input className={fieldClass("phone")} value={current.phone} onChange={(e) => role === "student" ? updateStudent("phone", formatPhone(e.target.value)) : updateAdmin("phone", formatPhone(e.target.value))} placeholder="+7 777 123 45 67" />
                </Field>

                {role === "student" ? (
                  <>
                    <Field label={t.university} error={errors.university}>
                      <select className={fieldClass("university")} value={student.university} onChange={(e) => updateStudent("university", e.target.value)}>
                        <option value="">{t.selectUniversity}</option>
                        {ALMATY_UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </Field>
                    <Field label={t.faculty} error={errors.faculty}>
                      <input className={fieldClass("faculty")} value={student.faculty} onChange={(e) => updateStudent("faculty", e.target.value)} />
                    </Field>
                    <Field label={t.course} error={errors.course}>
                      <select className={fieldClass("course")} value={student.course} onChange={(e) => updateStudent("course", e.target.value)}>
                        <option value="">{t.selectCourse}</option>
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={String(n)}>{n}</option>)}
                      </select>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={t.position} error={errors.position}>
                      <input className={fieldClass("position")} value={admin.position} onChange={(e) => updateAdmin("position", e.target.value)} />
                    </Field>
                    {admin.organizationType === "university" && (
                      <Field label={t.university} error={errors.university}>
                        <select className={fieldClass("university")} value={admin.university} onChange={(e) => updateAdmin("university", e.target.value)}>
                          <option value="">{t.selectUniversity}</option>
                          {ALMATY_UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label={t.dormName} error={errors.dormitoryName}>
                      <input className={fieldClass("dormitoryName")} value={admin.dormitoryName} onChange={(e) => updateAdmin("dormitoryName", e.target.value)} />
                    </Field>
                    <Field label={t.dormAddress} error={errors.dormitoryAddress}>
                      <input className={fieldClass("dormitoryAddress")} value={admin.dormitoryAddress} onChange={(e) => updateAdmin("dormitoryAddress", e.target.value)} placeholder="Алматы, ..." />
                    </Field>
                  </>
                )}

                <Field label={t.password} error={errors.password}>
                  <div className="password-wrap">
                    <input className={fieldClass("password")} type={showPassword ? "text" : "password"} value={current.password} onChange={(e) => role === "student" ? updateStudent("password", e.target.value) : updateAdmin("password", e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                </Field>
                <Field label={t.confirmPassword} error={errors.confirmPassword}>
                  <input className={fieldClass("confirmPassword")} type={showPassword ? "text" : "password"} value={current.confirmPassword} onChange={(e) => role === "student" ? updateStudent("confirmPassword", e.target.value) : updateAdmin("confirmPassword", e.target.value)} />
                </Field>
              </div>

              <label className={`agree-row ${errors.agree ? "invalid-check" : ""}`}>
                <input type="checkbox" checked={current.agree} onChange={(e) => role === "student" ? updateStudent("agree", e.target.checked) : updateAdmin("agree", e.target.checked)} />
                <span>{t.agree}</span>
              </label>
              {errors.agree && <small className="error-text block">{errors.agree}</small>}
              {serverError && <div className="form-alert error">{serverError}</div>}

              <button
                className="submit-button"
                disabled={busy || !emailVerified}
              >
                {busy
                  ? "..."
                  : emailVerified
                    ? t.create
                    : "Verify email first"}
              </button>
            </form>
            <p className="switch-auth">{t.hasAccount} <button onClick={() => onSwitch("login")}>{t.login}</button></p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="error-text">{error}</small>}
    </label>
  );
}
