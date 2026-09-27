import type { SVGProps } from 'react';
import NightIcon from './NightIcon';
const names: Record<string,string> = { '검색':'search', '닫기':'close', '삭제':'trash', '저장':'save', '공유':'share', '수정':'edit', '복사':'copy', '새로고침':'refresh' };
export default function ActionIcon({label,...props}: SVGProps<SVGSVGElement> & {label:string}) {
  return <NightIcon {...props} className="wave-action-icon" size={20} name={names[label] || 'info'}/>;
}
