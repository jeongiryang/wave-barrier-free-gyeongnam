"use client";

import { useId, useRef } from "react";
import AccessIcon, { type AccessIconName } from "../../../components/AccessIcons";
import { profiles as profileCatalog } from "../../planner/constants";
import type { Place } from "../../planner/types";
import { useFieldAccessibilityScan } from "../hooks/useFieldAccessibilityScan";
import { ACCEPTED_PHOTO_TYPES } from "../prepare-photo";
import type { FieldElement, FieldImpactLevel } from "../types";

/** 색만으로 상태를 말하지 않기 위해 단계마다 글자와 기호를 함께 둔다. */
const IMPACT_MARKS: Record<FieldImpactLevel, string> = {
  high_risk: "!",
  caution: "?",
  clear: "✓",
  unknown: "–",
};

const SEVERITY_TEXT: Record<string, string> = {
  high: "이동에 큰 영향",
  medium: "이동에 영향 있음",
  low: "영향은 작아 보임",
  unknown: "영향 정도 확인 필요",
};

function profileMeta(id: string) {
  return profileCatalog.find((profile) => profile.id === id);
}

function ElementRow({ element }: { element: FieldElement }) {
  const detected = element.detected;
  return <li className={detected ? (element.barrier ? "is-barrier" : "is-support") : "is-unknown"}>
    <span aria-hidden="true">{detected ? (element.barrier ? "!" : "✓") : "–"}</span>
    <div>
      <b>{element.label}</b>
      <em>{detected ? "발견됨" : "확인되지 않음"}</em>
      {detected && <small>{SEVERITY_TEXT[element.severity] || SEVERITY_TEXT.unknown}</small>}
      {element.description && <p>{element.description}</p>}
    </div>
  </li>;
}

export default function FieldAccessibilityScanner({ place, selectedProfiles }: { place: Place; selectedProfiles: string[] }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, result, message, preview, scan, reset } = useFieldAccessibilityScan(place, selectedProfiles);
  const busy = state === "preparing" || state === "analyzing";
  const analysis = result?.analysis;

  return <section className="field-scan" aria-labelledby={`${inputId}-title`}>
    <div className="field-scan-head">
      <div>
        <h3 id={`${inputId}-title`}>현장 접근성 확인</h3>
        <p>지금 현장에서 찍은 사진으로 계단·단차·경사로 같은 이동 요소를 확인합니다. 공식 무장애 정보를 대신하지 않는 보조 안내입니다.</p>
      </div>
    </div>

    <input
      ref={inputRef}
      id={inputId}
      className="field-scan-input"
      type="file"
      accept={ACCEPTED_PHOTO_TYPES.join(",")}
      capture="environment"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void scan(file);
      }}
    />

    <div className="field-scan-actions">
      <button type="button" className="field-scan-start" onClick={() => inputRef.current?.click()} disabled={busy}>
        {state === "done" || state === "retake" ? "다른 사진으로 다시 확인" : "사진 촬영 또는 선택"}
        <span aria-hidden="true">＋</span>
      </button>
      {(state === "done" || state === "retake" || state === "error") && (
        <button type="button" className="field-scan-reset" onClick={reset}>결과 지우기</button>
      )}
    </div>

    <p className="field-scan-privacy">사진은 기기에서 다시 그려 촬영 위치 정보를 지운 뒤 분석에 사용하며, 원본 사진은 저장하지 않습니다.</p>

    <div className="field-scan-status" role="status" aria-live="polite">
      {state === "preparing" && <span>사진을 준비하는 중입니다.</span>}
      {state === "analyzing" && <span>현장 사진을 분석하는 중입니다.</span>}
      {state === "retake" && <span className="field-scan-warn"><b aria-hidden="true">!</b>{message}</span>}
      {state === "error" && <span className="field-scan-warn"><b aria-hidden="true">!</b>{message}</span>}
    </div>

    {preview && busy && <div className="field-scan-preview">
      {/* 기기에서 방금 다시 그린 data URL이라 next/image의 원격 최적화 대상이 아니다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="" />
    </div>}

    {state === "done" && analysis && <div className="field-scan-result">
      {analysis.sceneDescription && <p className="field-scan-scene">{analysis.sceneDescription}</p>}

      <div className="field-scan-columns">
        <section className="field-scan-official">
          <h4><span aria-hidden="true">◆</span>공식 관광 정보</h4>
          <ul>
            {result?.officialData?.features?.length
              ? result.officialData.features.slice(0, 4).map((feature) => <li key={feature}><span aria-hidden="true">✓</span><div><b>{feature}</b><em>확인됨</em></div></li>)
              : <li className="is-unknown"><span aria-hidden="true">–</span><div><b>공식 편의정보</b><em>기록 없음</em></div></li>}
          </ul>
          <small>출처 {result?.officialData?.provider || place.source}</small>
        </section>

        <section className="field-scan-field">
          <h4><span aria-hidden="true">◈</span>현장 AI 분석</h4>
          <ul>
            {analysis.elements.length
              ? analysis.elements.slice(0, 6).map((element) => <ElementRow key={element.type} element={element} />)
              : <li className="is-unknown"><span aria-hidden="true">–</span><div><b>이동 요소</b><em>확인되지 않음</em></div></li>}
          </ul>
          <small>사진 판독 결과 · 공식 인증 아님</small>
        </section>
      </div>

      {Boolean(result?.conflicts?.length) && <div className="field-scan-conflict">
        <h4><span aria-hidden="true">!</span>공식 정보와 다르게 보이는 부분</h4>
        <ul>{result?.conflicts?.map((conflict) => <li key={conflict.element}>{conflict.message}</li>)}</ul>
        <small>공식 정보는 그대로 두고 두 내용을 함께 보여드립니다.</small>
      </div>}

      <div className="field-scan-impacts">
        <h4>이용 조건별 안내</h4>
        <ul>
          {(selectedProfiles.length ? selectedProfiles : Object.keys(analysis.userTypeImpacts)).map((profile) => {
            const impact = analysis.userTypeImpacts[profile];
            const meta = profileMeta(profile);
            if (!impact || !meta) return null;
            return <li key={profile} className={`impact-${impact.level}`}>
              <AccessIcon name={meta.icon as AccessIconName} size={20} />
              <div>
                <b>{meta.label}</b>
                <em><i aria-hidden="true">{IMPACT_MARKS[impact.level]}</i>{impact.label}</em>
                {impact.reasons.length > 0 && <small>{impact.reasons.join(" · ")} 확인됨</small>}
              </div>
            </li>;
          })}
        </ul>
      </div>

      {Boolean(analysis.obstacles.length) && <p className="field-scan-measure">{analysis.obstacles[0].measurementNote}</p>}

      <p className="field-scan-note">
        사진에 보이지 않는 공간은 판단할 수 없고 정확한 단차·거리는 측정할 수 없습니다.
        이 결과는 공식 무장애 인증이 아니며 방문 전 현장 확인이 필요합니다.
        {analysis.overallConfidence !== null && ` 판독 확신도 ${Math.round(analysis.overallConfidence * 100)}%.`}
      </p>
    </div>}
  </section>;
}
