import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { upsertUserFromFirebase } from "../repositories/user-repository.js";

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

export function createFirebaseAuthMiddleware({
  authFactory = getFirebaseAuth,
  userProvisioner = upsertUserFromFirebase,
} = {}) {
  return async function requireFirebaseUser(req, res, next) {
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);

    if (!match) {
      return res.status(401).json({
        error: { code: "AUTH_REQUIRED", message: "Firebase ID token is required." }
      });
    }

    try {
      const auth = authFactory();
      if (!auth) {
        return res.status(503).json({
          error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured." }
        });
      }

      // checkRevoked=true rejects revoked/disabled Firebase sessions.
      const decoded = await auth.verifyIdToken(match[1], true);
      if (!decoded.uid) {
        return res.status(401).json({
          error: { code: "INVALID_TOKEN", message: "Authentication token is invalid." }
        });
      }

      const appUser = await userProvisioner(decoded);
      req.user = {
        id: appUser.id,
        firebaseUid: decoded.uid,
        email: appUser.email ?? decoded.email ?? null,
        displayName: appUser.display_name ?? decoded.name ?? null,
        photoUrl: appUser.photo_url ?? decoded.picture ?? null,
        emailVerified: appUser.email_verified ?? decoded.email_verified === true,
      };
      return next();
    } catch (error) {
      if (error?.code === "DATABASE_NOT_CONFIGURED" ||
          error?.code === "ECONNREFUSED" ||
          error?.code === "ETIMEDOUT") {
        return res.status(503).json({
          error: { code: "IDENTITY_STORE_UNAVAILABLE", message: "User identity storage is unavailable." }
        });
      }

      if (error?.code?.startsWith?.("MODEL_")) {
        // Not expected here, but avoid accidentally classifying non-auth errors.
      }
      if (error?.code === "23503" || error?.code === "42P01") {
        return res.status(503).json({
          error: { code: "IDENTITY_SCHEMA_NOT_READY", message: "User identity database is not ready." }
        });
      }

      if (error?.name === "FirebaseAuthError" ||
          error?.code?.startsWith?.("auth/")) {
        return res.status(401).json({
          error: { code: "INVALID_TOKEN", message: "Authentication token is invalid or expired." }
        });
      }

      return res.status(503).json({
        error: { code: "IDENTITY_UNAVAILABLE", message: "Identity verification is temporarily unavailable." }
      });
    }
  };
}

export const requireFirebaseUser = createFirebaseAuthMiddleware();
