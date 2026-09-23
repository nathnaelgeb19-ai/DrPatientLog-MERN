import jwt from "jsonwebtoken";
import { Doctor } from "../models/index.js";

const SESSION_COOKIE = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 10,
};

export async function auth(req, res, next) {
  try {
    const token = req.cookies.dpl_session;
    if (!token) throw new Error();

    const p = jwt.verify(token, process.env.JWT_SECRET);
    const d = await Doctor.findById(p.id);
    if (!d) throw new Error();

    req.doctor = d;

    // Refresh the 10-minute session on authenticated activity.
    const refreshedToken = jwt.sign(
      { id: d._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );

    res.cookie("dpl_session", refreshedToken, SESSION_COOKIE);

    next();
  } catch {
    res.status(401).json({ message: "Authentication required" });
  }
}

export function adminOnly(req, res, next) {
  if (req.doctor?.role !== "admin")
    return res.status(403).json({ message: "Administrator access required" });

  next();
}
