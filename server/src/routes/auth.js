import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Doctor, Setting, AuditLog } from "../models/index.js";
import { auth } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/email.js";
const r = Router(),
  cookie = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 10,
  };
const sign = (d) =>
  jwt.sign({ id: d._id }, process.env.JWT_SECRET, { expiresIn: "10m" });
r.get("/status", async (q, s) =>
  s.json({ setupRequired: (await Doctor.countDocuments()) === 0 }),
);
r.get("/me", auth, (q, s) => s.json({ doctor: q.doctor }));
r.post("/setup", async (q, s) => {
  if (await Doctor.countDocuments())
    return s.status(409).json({ message: "Setup already completed" });
  const { name, username, password, email } = q.body;
  if (!name || !username || !password)
    return s
      .status(400)
      .json({ message: "Name, username and password are required" });
  const d = await Doctor.create({
    name,
    username,
    passwordHash: await bcrypt.hash(password, 12),
    email,
    role: "admin",
  });
  await Setting.updateOne(
    { key: "setup_required" },
    { key: "setup_required", value: "0" },
    { upsert: true },
  );
  s.cookie("dpl_session", sign(d), cookie).json({ doctor: d });
});
r.post("/login", async (q, s) => {
  const d = await Doctor.findOne({
    username: (q.body.username || "").toLowerCase().trim(),
  });
  if (!d || !(await bcrypt.compare(q.body.password || "", d.passwordHash)))
    return s.status(401).json({ message: "Invalid username or password" });
  await AuditLog.create({
    doctorId: d._id,
    doctorName: d.name,
    action: "login",
    entity: "auth",
    detail: "Successful sign in",
  });
  s.cookie("dpl_session", sign(d), cookie).json({ doctor: d });
});
r.post("/logout", (q, s) =>
  s.clearCookie("dpl_session", cookie).json({ ok: true }),
);
r.post("/forgot", async (q, s) => {
  try {
    const d = await Doctor.findOne({
      email: (q.body.email || "").toLowerCase().trim(),
    });
    if (!d) return s.json({ ok: true });
    const raw = crypto.randomBytes(32).toString("hex");
    d.resetTokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    d.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await d.save();
    await sendPasswordResetEmail({ to: d.email, name: d.name, token: raw });
    s.json({
      ok: true,
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (e) {
    s.status(500).json({ message: "Unable to send the password reset email." });
  }
});
r.post("/reset", async (q, s) => {
  const hash = crypto
    .createHash("sha256")
    .update(q.body.token || "")
    .digest("hex");
  const d = await Doctor.findOne({
    resetTokenHash: hash,
    resetTokenExpiresAt: { $gt: new Date() },
  });
  if (!d)
    return s.status(400).json({ message: "Invalid or expired reset token" });
  d.passwordHash = await bcrypt.hash(q.body.password, 12);
  d.resetTokenHash = "";
  d.resetTokenExpiresAt = null;
  await d.save();
  s.json({ ok: true });
});
export default r;

