"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WaveHeader from "../../../components/WaveHeader";
import { plannerJson, PlannerRequestError } from "../../planner/services/api";
import { useSavedPlaceEvidence } from "../../planner/hooks/useSavedPlaceEvidence";
import { visitDurationFor } from "../../planner/optimization/itinerary-schedule.js";
import type { CompanionPayload } from "../../../server/trips/companions-handler";
import type { CompanionEdit } from "../../../lib/experience.js";
import styles from "../../planner/components/TravelExperience.module.css";
type State = CompanionPayload & {
  id: string;
  role: "owner" | "editor" | "proposer" | "viewer";
  revision: number;
  expiresAt: number;
  invitation?: string;
  revoked?: boolean;
};
const ROLES = {
  owner: "만든 사람",
  editor: "편집",
  proposer: "제안",
  viewer: "보기",
};
const MODES = {
  "accessible-taxi": "장애인 콜택시",
  taxi: "일반 택시",
  bus: "버스",
  other: "기타",
};
const STATUS = {
  planned: "계획",
  requested: "요청함",
  confirmed: "배차 확인함",
  completed: "이동 완료",
  cancelled: "취소",
};
export default function CompanionScreen({ id }: { id: string }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [invitation, setInvitation] = useState("");
  const [draft, setDraft] = useState<{
    edit: CompanionEdit;
    revision: number;
  } | null>(null);
  const [toId, setToId] = useState(""),
    [amount, setAmount] = useState(""),
    [names, setNames] = useState(""),
    [payer, setPayer] = useState(""),
    [mode, setMode] = useState("accessible-taxi"),
    [status, setStatus] = useState("planned");
  const current = useRef<State | null>(null),
    mutation = useRef(false),
    poll = useRef(false),
    mounted = useRef(true),
    inviteToken = useRef("");
  const accept = useCallback((data: State) => {
    if (!mounted.current) return;
    if (!current.current || data.revision >= current.current.revision) {
      current.current = data;
      setState(data);
    }
  }, []);
  const refresh = useCallback(async () => {
    if (poll.current || mutation.current || document.hidden) return;
    poll.current = true;
    try {
      const data = await plannerJson<State>(
        `/api/companions/${id}`,
        inviteToken.current
          ? {
              method: "POST",
              body: { operation: "join", token: inviteToken.current },
            }
          : {},
      );
      accept(data);
      inviteToken.current = "";
      setError("");
    } catch (e) {
      if (mounted.current) {
        setError((e as Error).message);
        if (
          e instanceof PlannerRequestError &&
          [401, 403, 404].includes(e.status)
        ) {
          current.current = null;
          setState(null);
          setDraft(null);
          setInvitation("");
        }
      }
    } finally {
      poll.current = false;
    }
  }, [id, accept]);
  useEffect(() => {
    mounted.current = true;
    const token = new URLSearchParams(location.hash.slice(1)).get("invite");
    if (token) {
      inviteToken.current = token;
      history.replaceState(null, "", location.pathname);
    }
    const start = setTimeout(async () => {
      if (inviteToken.current) {
        try {
          const data = await plannerJson<State>(`/api/companions/${id}`, {
            method: "POST",
            body: { operation: "join", token: inviteToken.current },
          });
          accept(data);
          inviteToken.current = "";
        } catch (e) {
          if (mounted.current) {
            setError((e as Error).message);
            if (
              e instanceof PlannerRequestError &&
              [401, 403, 404].includes(e.status)
            ) {
              current.current = null;
              setState(null);
              setDraft(null);
              setInvitation("");
            }
          }
        }
      } else void refresh();
    }, 0);
    const timer = setInterval(() => void refresh(), 10000);
    const visible = () => void refresh();
    document.addEventListener("visibilitychange", visible);
    return () => {
      mounted.current = false;
      clearTimeout(start);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [id, refresh, accept]);
  const evidence = useSavedPlaceEvidence(
    state?.selections.selectedPlaceIds || [],
    [],
    Boolean(state),
  );
  const name = (stopId: string) =>
    evidence.places.find((p) => p.id === stopId)?.name || `장소 ${stopId}`;
  async function write(
    body: Record<string, unknown>,
    revision = state?.revision,
  ) {
    if (!state || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setNotice("");
    try {
      const data = await plannerJson<State>(`/api/companions/${id}`, {
        method: "POST",
        body: { ...body, revision },
      });
      if (data.revoked) {
        setState(null);
        current.current = null;
        setError("동행 일정을 종료했어요.");
        return;
      }
      accept(data);
      if (body.operation === "cancel-invites") setInvitation("");
      if (data.invitation) setInvitation(data.invitation);
      setNotice("저장했어요. 동행 화면에 10초 안에 반영됩니다.");
      if (body.operation === "edit" || body.operation === "propose")
        setDraft(null);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  const canEdit = state?.role === "owner" || state?.role === "editor";
  return (
    <div className="wave-night night-secondary night-companion">
      <WaveHeader current="planner" />
      <main
        className={styles.experience}
        style={{ maxWidth: 1000, margin: "24px auto" }}
        lang="ko"
      >
        <h1>함께 만드는 경남 일정</h1>
        <p>
          열린 화면은 10초마다 갱신돼요. 입력 중인 내용은 유지하며 다른 변경이
          있으면 다시 확인한 뒤 저장합니다.
        </p>
        {error && (
          <p role="alert" className="modal-note">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" onClick={() => void refresh()}>
            최신 일정 확인
          </button>
          <Link href={`/login?next=${encodeURIComponent(`/companion/${id}`)}`}>
            로그인
          </Link>
          <Link href="/planner">내 여행 설계</Link>
        </div>
        {state && (
          <>
            <p>
              {state.selections.region} · {state.selections.travelStart} —{" "}
              {state.selections.travelEnd} · {ROLES[state.role]} 권한 · 버전{" "}
              {state.revision} ·{" "}
              {new Date(state.expiresAt).toLocaleDateString("ko-KR")}까지
            </p>
            {state.role === "owner" && (
              <details className={styles.card}>
                <summary>동행 초대·권한 관리</summary>
                <p>
                  링크를 가진 사람이 해당 권한을 얻습니다. 필요한 동행에게만
                  직접 전달해 주세요. 같은 권한의 새 초대를 만들면 이전 초대와
                  접속 권한은 종료됩니다.
                </p>
                <div className={styles.actions}>
                  {(["viewer", "proposer", "editor"] as const).map((role) => (
                    <button
                      type="button"
                      key={role}
                      disabled={busy}
                      onClick={() => void write({ operation: "invite", role })}
                    >
                      {ROLES[role]} 초대 만들기
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void write({ operation: "cancel-invites" })}
                  >
                    모든 초대 권한 종료
                  </button>
                </div>
                {invitation && (
                  <label>
                    전달할 초대 주소
                    <input
                      aria-label="전달할 초대 주소"
                      readOnly
                      value={invitation}
                      style={{ width: "100%" }}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(invitation)
                          .then(() => setNotice("초대 주소를 복사했어요."))
                          .catch(() =>
                            setNotice("주소를 직접 선택해 복사해 주세요."),
                          );
                      }}
                    >
                      초대 주소 복사
                    </button>
                  </label>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void write({ operation: "revoke" })}
                >
                  동행 일정 종료
                </button>
              </details>
            )}
            <p>{evidence.notice}</p>
            <ol>
              {state.selections.selectedPlaceIds.map((stopId) => (
                <li className={styles.card} key={stopId}>
                  <h2>{name(stopId)}</h2>
                  <p>
                    {state.selections.scheduleAssignments[stopId]} · 체류{" "}
                    {state.selections.visitMinutesByPlaceId[stopId] ??
                      visitDurationFor(
                        evidence.places.find((p) => p.id === stopId),
                      )}
                    분 · 휴식{" "}
                    {state.selections.breakMinutesByPlaceId[stopId] || 0}분
                    {state.selections.fixedVisits[stopId] ? " · 고정 방문" : ""}
                  </p>
                  {state.role !== "viewer" &&
                    !state.selections.fixedVisits[stopId] && (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              edit: {
                                id: stopId,
                                minutes:
                                  state.selections.visitMinutesByPlaceId[
                                    stopId
                                  ] ??
                                  visitDurationFor(
                                    evidence.places.find(
                                      (p) => p.id === stopId,
                                    ),
                                  ),
                                breakMinutes:
                                  state.selections.breakMinutesByPlaceId[
                                    stopId
                                  ] || 0,
                              },
                              revision: state.revision,
                            })
                          }
                        >
                          시간 변경안 작성
                        </button>
                        {(["up", "down"] as const).map((direction) => (
                          <button
                            type="button"
                            key={direction}
                            onClick={() =>
                              setDraft({
                                edit: { id: stopId, direction },
                                revision: state.revision,
                              })
                            }
                          >
                            {direction === "up" ? "앞으로" : "뒤로"} 이동안
                          </button>
                        ))}
                      </div>
                    )}
                </li>
              ))}
            </ol>
            {draft && (
              <section className={styles.card} aria-label="동행 변경안">
                <h2>{name(draft.edit.id)} 변경안</h2>
                {draft.edit.direction ? (
                  <p>
                    같은 날의 {draft.edit.direction === "up" ? "앞" : "뒤"}{" "}
                    방문과 순서를 바꿉니다.
                  </p>
                ) : (
                  <div className={styles.fields}>
                    <label>
                      체류 시간(분)
                      <input
                        type="number"
                        min="15"
                        max="720"
                        value={draft.edit.minutes ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            edit: {
                              ...draft.edit,
                              minutes: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      휴식 시간(분)
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={draft.edit.breakMinutes ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            edit: {
                              ...draft.edit,
                              breakMinutes: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                )}
                <p>
                  이후 도착 시각이 바뀔 수 있어요. 내 여행 설계에 가져온 뒤
                  이동시간·고정 방문·귀가 시간을 다시 확인해 주세요.
                </p>
                {draft.revision !== state.revision && (
                  <p role="alert">
                    다른 변경이 도착했어요. 입력값을 확인하고 최신 버전 기준으로
                    다시 검토해 주세요.
                  </p>
                )}
                <div className={styles.actions}>
                  <button
                    type="button"
                    disabled={busy || draft.revision !== state.revision}
                    onClick={() =>
                      void write(
                        {
                          operation: canEdit ? "edit" : "propose",
                          edit: draft.edit,
                        },
                        draft.revision,
                      )
                    }
                  >
                    {canEdit ? "변경 적용" : "동행에게 제안"}
                  </button>
                  {draft.revision !== state.revision && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, revision: state.revision })
                      }
                    >
                      최신 일정과 비교했어요
                    </button>
                  )}
                  <button type="button" onClick={() => setDraft(null)}>
                    취소
                  </button>
                </div>
              </section>
            )}
            {!!state.proposals.length && (
              <section className={styles.card}>
                <h2>동행의 제안</h2>
                {state.proposals.map((p) => (
                  <div key={p.id}>
                    <p>
                      {name(p.edit.id)} ·{" "}
                      {p.edit.direction
                        ? `${p.edit.direction === "up" ? "앞" : "뒤"}으로 이동`
                        : `체류 ${p.edit.minutes}분, 휴식 ${p.edit.breakMinutes}분`}{" "}
                      · 제안 버전 {p.revision}
                    </p>
                    {canEdit && (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          disabled={busy || p.revision !== state.revision}
                          onClick={() =>
                            void write({
                              operation: "accept",
                              proposalId: p.id,
                            })
                          }
                        >
                          제안 적용
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void write({
                              operation: "dismiss",
                              proposalId: p.id,
                            })
                          }
                        >
                          제안 닫기
                        </button>
                        {p.revision !== state.revision && (
                          <p>
                            이후 변경이 있어요. 최신 일정에서 다시 제안해
                            주세요.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}
            <section className={styles.card}>
              <h2>이동 상태와 비용 나누기</h2>
              <p>
                실제 탑승자끼리 원 단위로 나눕니다. 입력한 금액과 배차 상태는
                동행의 기록이며 실제 예약·결제와 연결되지 않습니다.
              </p>
              {canEdit && (
                <>
                  <div className={styles.fields}>
                    <label>
                      도착 장소
                      <select
                        value={toId}
                        onChange={(e) => setToId(e.target.value)}
                      >
                        <option value="">이동 구간 선택</option>
                        {state.selections.selectedPlaceIds.map((stopId) => (
                          <option key={stopId} value={stopId}>
                            {name(stopId)}까지
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      이동 수단
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                      >
                        {Object.entries(MODES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      상태(동행 확인)
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {Object.entries(STATUS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      총액(원)
                      <input
                        type="number"
                        min="1"
                        max="10000000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </label>
                    <label>
                      탑승자 별칭(쉼표로 구분)
                      <input
                        maxLength={250}
                        placeholder="나, 동행1"
                        value={names}
                        onChange={(e) => setNames(e.target.value)}
                      />
                    </label>
                    <label>
                      결제자 별칭
                      <input
                        maxLength={20}
                        value={payer}
                        onChange={(e) => setPayer(e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void write({
                        operation: "expense",
                        expense: {
                          toId,
                          mode,
                          status,
                          amount: Number(amount),
                          participants: names.split(",").map((n) => n.trim()),
                          payer: payer.trim(),
                        },
                      })
                    }
                  >
                    이동·분담 기록
                  </button>
                </>
              )}
              {state.expenses.map((e) => (
                <article key={e.id} className={styles.card}>
                  <h3>
                    {name(e.toId)}까지 · {MODES[e.mode as keyof typeof MODES]}
                  </h3>
                  <p>
                    {STATUS[e.status as keyof typeof STATUS]} · 동행이 직접 입력
                    · {e.amount.toLocaleString()}원 · 결제 {e.payer}
                  </p>
                  <ul>
                    {e.shares.map((s) => (
                      <li key={s.name}>
                        {s.name}: {s.amount.toLocaleString()}원{" "}
                        {s.payer ? "(결제자 몫)" : `→ ${e.payer}에게 정산`}
                      </li>
                    ))}
                  </ul>
                  {canEdit && (
                    <div className={styles.actions}>
                      {Object.entries(STATUS).map(([key, label]) => (
                        <button
                          type="button"
                          key={key}
                          disabled={busy || key === e.status}
                          onClick={() =>
                            void write({
                              operation: "expense",
                              expenseId: e.id,
                              expense: { ...e, status: key },
                            })
                          }
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void write({
                            operation: "remove-expense",
                            expenseId: e.id,
                          })
                        }
                      >
                        이동 기록 삭제
                      </button>
                    </div>
                  )}
                </article>
              ))}
              <Link href="/planner">여행 설계에서 지역 교통 안내 확인</Link>
              <p>
                장애인 콜택시는 지역의 공식 접수처에서 이용 자격·운행
                구역·예약과 배차를 확인해 주세요. 배차 대기 시간을 확정
                이동시간으로 계산하지 않습니다.
              </p>
            </section>
            <details className={styles.card}>
              <summary>최근 변경 기록</summary>
              <ul>
                {state.history.map((h, i) => (
                  <li key={`${h.at}-${i}`}>
                    {new Date(h.at).toLocaleString("ko-KR")} · {ROLES[h.role]} ·{" "}
                    {h.label}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
        <p role="status">{notice}</p>
      </main>
    </div>
  );
}
