const PROVIDER_UNAVAILABLE_MESSAGE = "계정 탈퇴 기능을 현재 사용할 수 없습니다. 입력한 비밀번호는 저장되지 않았습니다.";
const ACCOUNT_STATE_MESSAGE = "현재 비밀번호와 계정 상태를 확인한 뒤 다시 시도해 주세요.";

function errorField(error, field) {
  return error && typeof error === "object" && field in error ? error[field] : undefined;
}

export function classifyAccountDeletionError(error) {
  const upstreamStatus = Number(errorField(error, "status"));
  const upstreamCode = String(errorField(error, "code") || "").toUpperCase();

  if (upstreamStatus === 404 || upstreamCode === "NOT_FOUND") {
    return {
      status: 503,
      code: "ACCOUNT_DELETION_NOT_CONFIGURED",
      message: PROVIDER_UNAVAILABLE_MESSAGE,
    };
  }
  if (upstreamStatus >= 500 || upstreamCode.startsWith("NETWORK_")) {
    return {
      status: 502,
      code: "ACCOUNT_DELETION_PROVIDER_UNAVAILABLE",
      message: PROVIDER_UNAVAILABLE_MESSAGE,
    };
  }
  return {
    status: 400,
    code: "ACCOUNT_DELETION_REJECTED",
    message: ACCOUNT_STATE_MESSAGE,
  };
}
