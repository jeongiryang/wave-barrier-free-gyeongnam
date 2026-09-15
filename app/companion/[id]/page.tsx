import CompanionScreen from "../../../features/trips/components/CompanionScreen";
export const metadata = {
  title: "동행과 함께 편집 | WAVE",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanionScreen id={id} />;
}
