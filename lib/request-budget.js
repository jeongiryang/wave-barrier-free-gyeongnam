/**
 * 요청 예산.
 *
 * 클라이언트가 서버보다 먼저 끊으면, 서버가 정상 응답해도 사용자는 실패만 본다.
 * 상류가 느렸을 뿐 성공한 결과가 버려지고, 화면에는 "준비 중"이나 실패 문구가
 * 남는다. 그래서 클라이언트 예산은 언제나 그 경로의 서버 최악 소요보다 길어야
 * 하고, 두 값이 서로 다른 파일에 흩어져 있으면 한쪽만 바뀌어 다시 역전된다.
 */

/** 상류 한 번 호출에 허용하는 시간. */
export const UPSTREAM_TIMEOUT_MS = {
  tourism: 9500,
  transport: 9500,
  location: 7000,
  weather: 8000,
};

/**
 * 관광 계획은 상류 호출을 세 단계로 나눠 순차 실행한다. 단계마다 최악을 더하면
 * 28.5초가 되는데, 그만큼 기다리게 하는 것은 답이 아니다. 전체를 이 예산으로
 * 묶고, 시간이 모자라면 그때까지 확인한 것만 돌려준다. 확인하지 못한 항목은
 * 지어내지 않고 그대로 "확인 필요"로 남는다.
 */
export const PLAN_TOTAL_BUDGET_MS = 12_000;

/** 상류 응답을 받은 뒤 정리·직렬화·전송에 두는 여유. */
export const SERVER_OVERHEAD_MS = 2_500;

/** 경로별 서버 최악 소요. 병렬로 부르는 경로는 가장 느린 한 번이 최악이다. */
export const SERVER_BUDGET_MS = {
  plan: PLAN_TOTAL_BUDGET_MS,
  enrich: UPSTREAM_TIMEOUT_MS.tourism,
  photo: UPSTREAM_TIMEOUT_MS.tourism,
  crowd: UPSTREAM_TIMEOUT_MS.tourism,
  route: UPSTREAM_TIMEOUT_MS.transport,
  location: UPSTREAM_TIMEOUT_MS.location,
  weather: UPSTREAM_TIMEOUT_MS.weather,
};

/**
 * 서버 예산을 감싸는 클라이언트 예산.
 * @param {number} serverBudgetMs
 * @returns {number}
 */
export function clientBudgetMs(serverBudgetMs) {
  return serverBudgetMs + SERVER_OVERHEAD_MS;
}

/** 화면에서 쓰는 경로별 클라이언트 예산. */
export const CLIENT_BUDGET_MS = Object.fromEntries(
  Object.entries(SERVER_BUDGET_MS).map(([name, budget]) => [name, clientBudgetMs(budget)]),
);

/**
 * 남은 예산 안에서 끝나지 않으면 준비된 대체값으로 넘어간다.
 *
 * 호출 하나하나에 타임아웃을 걸어도 전체 시간은 잡히지 않는다. 관광 계획은
 * 월을 거슬러 올라가며 반복 조회하는 구간이 있어, 상류가 느려지면 한 번 호출이
 * 아니라 수십 번으로 늘어난다. 그래서 단계마다 남은 예산을 다시 재고, 그
 * 안에 못 끝내면 확인하지 못한 것으로 두고 넘어간다. 지어내지는 않는다.
 *
 * @template T
 * @param {Promise<T>} work
 * @param {number} remainingMs
 * @param {() => T} onExpired 예산을 넘겼을 때 대신 쓸 값
 * @returns {Promise<T>}
 */
export function withinBudget(work, remainingMs, onExpired) {
  if (!(remainingMs > 0)) {
    void work.catch(() => undefined);
    return Promise.resolve(onExpired());
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(onExpired()), remainingMs);
    work.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * 예산 시작 시점을 기준으로 남은 시간을 돌려주는 함수를 만든다.
 * @param {number} totalMs
 * @param {() => number} [now]
 */
export function budgetClock(totalMs, now = Date.now) {
  const deadline = now() + totalMs;
  return () => Math.max(0, deadline - now());
}
