import type { ReactNode } from "react";
import { companionSupportPrograms, type CompanionSupportProgram } from "../companion-support";

type CompanionSupportCardProps = {
  programs?: readonly CompanionSupportProgram[];
};

export default function CompanionSupportCard({ programs = companionSupportPrograms }: CompanionSupportCardProps): ReactNode {
  if (!programs.length) return null;

  return <section className="companion-support-card" aria-labelledby="companion-support-title">
    <h3 id="companion-support-title">동행 도움이 필요하다면</h3>
    <p>공공 제도로 신청할 수 있어요. 며칠 전에 신청해야 하는 경우가 많아요.</p>
    <ul>
      {programs.map(program => <li key={program.id}>
        <strong>{program.name}</strong>
        <span>{program.institution}</span>
        <p>{program.howToApply}</p>
        {program.noticeDays && <small>{program.noticeDays}</small>}
        <small>확인한 날짜 {program.checkedOn}</small>
        <a href={program.url} target="_blank" rel="noopener noreferrer">공식 안내 보기</a>
      </li>)}
    </ul>
    <p className="companion-support-disclaimer">신청과 이용은 각 기관에서 정해요. W.A.V.E는 안내만 해요.</p>
  </section>;
}
