import Image from 'next/image';
export default function NaruAvatar({ state = 'idle', large = false }: { state?: string; large?: boolean }) {
  return <span className={`naru-character${large ? ' naru-character-large' : ''}`} data-state={state} aria-hidden="true"><Image src={`/naru/naru-${large ? '512' : '128'}.webp`} width={large ? 256 : 56} height={large ? 256 : 56} alt="" unoptimized /><span className="naru-character-orbit" /></span>;
}
