import AccountTripEditor from "../../../features/account-travel/AccountTripEditor";
import TravelShell from "../../../features/account-travel/TravelShell";
export const metadata = { title: "함께 만드는 내 여행 | W.A.V.E", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <TravelShell title="우리의 여행"><AccountTripEditor id={id} /></TravelShell>; }
