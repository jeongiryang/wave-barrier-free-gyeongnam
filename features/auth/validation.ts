import { checkAuthCredentials } from "../../lib/auth/credentials.js";
export { friendlyAuthError } from "../../lib/auth/error-message.js";
import type { AuthCredentials, AuthMode } from "./types";

export { AUTH_FALLBACK_PATH, safeAuthReturnPath } from "../../lib/auth/return-path.js";
export { looksLikeEmail } from "../../lib/auth/credentials.js";

export function readAuthCredentials(mode: AuthMode, form: FormData): { value?: AuthCredentials; error?: string; field?: string } {
  return checkAuthCredentials(mode, {
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
    name: String(form.get("name") || ""),
    confirmPassword: String(form.get("confirmPassword") || ""),
  });
}
