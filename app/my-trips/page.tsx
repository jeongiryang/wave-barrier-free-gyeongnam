import AccountTravelHome from "../../features/account-travel/AccountTravelHome";
import './home.css';
import TravelShell from "../../features/account-travel/TravelShell";
import { pageMetadata } from "../../lib/site-metadata";
export const metadata = pageMetadata({ title: "계정에 저장한 여행", description: "저장한 여행을 여러 기기에서 이어가고 동행자와 함께 계획하세요.", path: "/my-trips", index: false });
export default function Page() { return <TravelShell title="나의 다음 여행" compact><AccountTravelHome /></TravelShell>; }
