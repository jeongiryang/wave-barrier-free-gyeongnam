export const NEW_PASSWORD_MAX = 16;
export const EXISTING_PASSWORD_MAX = 128;
export const USERNAME_MIN = 4;
export const USERNAME_MAX = 12;
export function validNewUsername(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_.]{4,12}$/.test(value);
}
