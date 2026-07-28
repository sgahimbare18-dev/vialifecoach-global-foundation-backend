// Admin credentials utility
// Uses environment variables for secure credential management

const LEGACY_ADMIN_EMAIL = "academy@vialifecoach.org";

function normalizeEmail(email) {
  return email ? String(email).trim().toLowerCase() : "";
}

export function getAdminCredentials() {
  try {
    const email = process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    const password = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    
    if (!email || !password) {
      console.error("Admin credentials not found in environment variables");
      console.log("Looking for VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD or ADMIN_EMAIL and ADMIN_PASSWORD");
      return { email: null, password: null };
    }
    
    return { email, password };
  } catch (error) {
    console.error("Failed to get admin credentials:", error);
    return { email: null, password: null };
  }
}

export function validateAdminCredentials(inputEmail, inputPassword) {
  const { email, password } = getAdminCredentials();
  const normalizedInput = normalizeEmail(inputEmail);
  const normalizedPrimary = normalizeEmail(email);

  if (!password || inputPassword !== password) {
    return false;
  }

  return [normalizedPrimary, LEGACY_ADMIN_EMAIL].includes(normalizedInput);
}
