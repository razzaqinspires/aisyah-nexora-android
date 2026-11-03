import { getPool } from "../db/pool.js";

export async function upsertUserFromFirebase(decodedToken, pool = getPool()) {
  const query = `
    INSERT INTO app_users
      (firebase_uid, email, display_name, photo_url, email_verified, updated_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (firebase_uid)
    DO UPDATE SET
      email = COALESCE(EXCLUDED.email, app_users.email),
      display_name = COALESCE(EXCLUDED.display_name, app_users.display_name),
      photo_url = COALESCE(EXCLUDED.photo_url, app_users.photo_url),
      email_verified = EXCLUDED.email_verified,
      updated_at = now()
    RETURNING id, firebase_uid, email, display_name, photo_url,
              email_verified, created_at, updated_at
  `;
  const values = [
    decodedToken.uid,
    decodedToken.email ?? null,
    decodedToken.name ?? null,
    decodedToken.picture ?? null,
    decodedToken.email_verified === true,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}
