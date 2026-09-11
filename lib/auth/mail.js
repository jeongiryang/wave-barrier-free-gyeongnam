import nodemailer from "nodemailer";

const PRODUCTION_ORIGIN = "https://wave-barrier-free-gyeongnam.vercel.app";
const PURPOSES = {
  verify: { title: "WAVE 이메일 확인", action: "이메일 확인", path: "/api/auth/verify-email" },
  reset: { title: "WAVE 비밀번호 재설정", action: "비밀번호 재설정", path: "/api/auth/reset-password/" },
  delete: { title: "WAVE 계정 탈퇴 확인", action: "계정 탈퇴 확인", path: "/api/auth/delete-user/callback" },
};

function mailbox(value) {
  const address = typeof value === "string" ? value.trim() : "";
  if (address.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(address)) {
    throw new Error("AUTH_MAIL_INVALID_ADDRESS");
  }
  return address;
}

/** Gmail's displayed app-password spaces are formatting, never part of the password. */
export function authMailConfiguration(env = process.env) {
  const user = mailbox(env.SMTP_USER);
  if (!user.toLowerCase().endsWith("@gmail.com")) throw new Error("AUTH_MAIL_INVALID_SENDER");
  const pass = typeof env.SMTP_PASS === "string" ? env.SMTP_PASS.replace(/\s/g, "") : "";
  if (!/^[a-zA-Z]{16}$/.test(pass)) throw new Error("AUTH_MAIL_NOT_CONFIGURED");
  return {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
    dnsTimeout: 5_000,
    logger: false,
    debug: false,
    transactionLog: false,
    disableFileAccess: true,
    disableUrlAccess: true,
    maxRecipients: 1,
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

/** Only server-generated account links for this deployment can enter an email. */
export function accountEmail({ kind, to, url, origin = PRODUCTION_ORIGIN, allowLocalhost = false }) {
  const purpose = PURPOSES[kind];
  if (!purpose) throw new Error("AUTH_MAIL_INVALID_PURPOSE");
  let target;
  let base;
  try {
    base = new URL(origin);
    target = new URL(url);
  } catch {
    throw new Error("AUTH_MAIL_INVALID_LINK");
  }
  const local = allowLocalhost && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) && ["http:", "https:"].includes(base.protocol);
  if ((!local && base.origin !== PRODUCTION_ORIGIN) || base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new Error("AUTH_MAIL_INVALID_ORIGIN");
  if (target.origin !== base.origin || target.username || target.password || target.hash || target.href.length > 4_096) throw new Error("AUTH_MAIL_INVALID_LINK");
  const pathMatches = kind === "reset"
    ? /^\/api\/auth\/reset-password\/[A-Za-z0-9_-]{16,256}$/.test(target.pathname)
    : target.pathname === purpose.path && /^[A-Za-z0-9_.-]{16,2048}$/.test(target.searchParams.get("token") || "");
  if (!pathMatches) throw new Error("AUTH_MAIL_INVALID_LINK");
  const callback = target.searchParams.get("callbackURL");
  if (callback) {
    const destination = new URL(callback, base);
    const allowed = kind === "reset" ? ["/reset-password"] : kind === "delete" ? ["/account/delete-complete"] : ["/account", "/community", "/login"];
    if (destination.origin !== base.origin || destination.username || destination.password || !allowed.includes(destination.pathname)) throw new Error("AUTH_MAIL_INVALID_LINK");
  }
  const introduction = kind === "delete"
    ? "계정 탈퇴를 요청하셨습니다. 아래 링크에서 본인 확인 후 탈퇴를 완료할 수 있습니다."
    : kind === "reset"
      ? "WAVE 계정의 비밀번호 재설정을 요청하셨습니다. 아래 링크에서 새 비밀번호를 설정해 주세요."
      : "WAVE 계정에 사용할 이메일 주소를 확인해 주세요.";
  return {
    to: { address: mailbox(to) },
    subject: purpose.title,
    text: `${purpose.title}\n\n${introduction}\n\n${purpose.action}: ${target.href}\n\n본인이 요청하지 않았다면 이 메일을 무시해 주세요. 링크는 한 번만 사용할 수 있으며, 만료된 경우 WAVE에서 다시 요청할 수 있습니다.\n\nWAVE`,
    html: `<div lang="ko" style="font-family:Arial,sans-serif;color:#183153;line-height:1.7;max-width:560px;margin:auto;padding:28px"><p style="font-weight:700">WAVE</p><h1 style="font-size:24px">${purpose.title}</h1><p>${introduction}</p><p><a href="${escapeHtml(target.href)}" style="display:inline-block;padding:12px 20px;background:#174ea6;color:#fff;border-radius:8px">${purpose.action}</a></p><p>본인이 요청하지 않았다면 이 메일을 무시해 주세요. 링크는 한 번만 사용할 수 있으며, 만료된 경우 WAVE에서 다시 요청할 수 있습니다.</p></div>`,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

/** No logs, automatic retries, arbitrary templates, attachments or multi-recipient mail. */
export function createAccountMailer(env = process.env, createTransport = nodemailer.createTransport) {
  const configuration = authMailConfiguration(env);
  const transporter = createTransport(configuration);
  return async (message) => {
    const contents = accountEmail(message);
    try {
      const receipt = await transporter.sendMail({ ...contents, from: { name: "WAVE", address: configuration.auth.user } });
      if (receipt.accepted?.length !== 1 || receipt.rejected?.length) throw new Error("delivery-rejected");
    } catch {
      // SMTP errors can contain email addresses, AUTH data and provider response details.
      throw new Error("AUTH_MAIL_DELIVERY_FAILED");
    }
  };
}

/** Deployment preflight authenticates with SMTP without delivering any email. */
export async function verifyAccountMailer(env = process.env, createTransport = nodemailer.createTransport) {
  const transport = createTransport(authMailConfiguration(env));
  try {
    if (await transport.verify() !== true) throw new Error("not-ready");
  } catch { throw new Error("AUTH_MAIL_NOT_READY"); }
  finally { transport.close(); }
}
