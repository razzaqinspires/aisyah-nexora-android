import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let authInstance;

export function getFirebaseAuth() {
  if (authInstance) return authInstance;

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS &&
      !process.env.FIREBASE_CONFIG &&
      process.env.GOOGLE_CLOUD_PROJECT == null) {
    return null;
  }

  const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
  authInstance = getAuth(app);
  return authInstance;
}

export async function requireFirebaseUser(req, res, next) {
  const header = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);

  if (!match) {
    return res.status(401).json({
      error: { code: "AUTH_REQUIRED", message: "Firebase ID token is required." }
    });
  }

  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      return res.status(503).json({
        error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured." }
      });
    }
    const decoded = await auth.verifyIdToken(match[1], true);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    return next();
  } catch {
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Authentication token is invalid or expired." }
    });
  }
}
