import JoinTrip from "../../../features/account-travel/JoinTrip";
import TravelShell from "../../../features/account-travel/TravelShell";
export const metadata = { title: "여행 초대 | W.A.V.E", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <TravelShell title="함께 떠나요"><JoinTrip id={id} /></TravelShell>; }
