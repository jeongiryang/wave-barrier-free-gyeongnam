import FestivalExplorer from '../../features/festivals/FestivalExplorer';
import './festivals.css';
import { pageMetadata } from '../../lib/site-metadata';
export const metadata = pageMetadata({ title: '경남 축제와 여행', description: '실제 축제 날짜와 필요한 편의를 확인하고 나루와 주변 여행 코스를 만드세요.', path: '/festivals' });
export default function Page() { return <FestivalExplorer />; }
