import '../config/env.js';
import { findUserByEmail } from "../models/User.model.js";
import jwt from "jsonwebtoken";
import { getAdminCredentials } from "../utils/adminCredentials.js";

// Get encoded admin email
const HARDCODED_ADMIN_EMAIL = getAdminCredentials().email;
const LEGACY_ADMIN_EMAIL = "academy@vialifecoach.org";

function normalizeEmail(email) {
  return email ? String(email).trim().toLowerCase() : "";
}

function isAdminEmail(email) {
  const normalized = normalizeEmail(email);
  return [normalizeEmail(HARDCODED_ADMIN_EMAIL), LEGACY_ADMIN_EMAIL].includes(normalized);
}

function isAdminToken(payload) {
  return (
    payload?.role === "admin" ||
    isAdminEmail(payload?.email) ||
    payload?.id === 0 ||
    payload?.id === "0"
  );
}

function normalizeRole(role) {
  if (!role) return role;
  if (role === "lecturer") return "instructor";
  return role;
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access token required" });

  try {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const payload = jwt.verify(token, secret);

    // ======= HARDCODED ADMIN BYPASS =======
    if (isAdminToken(payload)) {
      req.user = {
        id: payload.id ?? 0,
        email: HARDCODED_ADMIN_EMAIL || payload.email,
        name: payload.name || "Admin",
        role: "admin",
        verified: true,
      };
      return next();
    }
    // ======= END HARDCODED ADMIN BYPASS =======

    const user = await findUserByEmail(payload.email);
    if (!user) return res.status(401).json({ message: "User not found for this token" });

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
      verified: user.verified,
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token expired or invalid" });
  }
}

export async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return next();
  }

  try {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const payload = jwt.verify(token, secret);

    // ======= HARDCODED ADMIN BYPASS =======
    if (isAdminToken(payload)) {
      req.user = {
        id: payload.id ?? 0,
        email: HARDCODED_ADMIN_EMAIL || payload.email,
        name: payload.name || "Admin",
        role: "admin",
        verified: true,
      };
      return next();
    }
    // ======= END HARDCODED ADMIN BYPASS =======

    const user = await findUserByEmail(payload.email);
    if (!user) return res.status(401).json({ message: "User not found for this token" });

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
      verified: user.verified,
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token expired or invalid" });
  }
}

export function requireRoles(...allowedRoles) {
  const normalizedRoles = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    if (!normalizedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: "You do not have permission to access this resource" });
    }
    next();
  };
}
