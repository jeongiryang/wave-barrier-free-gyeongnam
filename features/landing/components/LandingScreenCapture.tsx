"use client";

import { useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

/** Original product pixels are contained, never cropped to conceal source watermarks. */
export default function LandingScreenCapture({ name, width, height, alt }: { name: string; width: number; height: number; alt: string }) {
  const en = useSitePreferences().locale === "en";
  const [failed, setFailed] = useState(false);
  return <div className="story-screen" style={{ aspectRatio: `${width}/${height}` }}>
    {failed ? <p role="status">{en ? "The screen image could not load. The places and dates remain available below." : "화면 이미지를 불러오지 못했어요. 장소와 날짜는 아래에서 확인할 수 있어요."}</p>
      : <img src={`/media/wave-journey/${name}.webp`} width={width} height={height} loading="lazy" decoding="async" lang="ko" alt={alt}
        ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} onError={() => setFailed(true)} />}
  </div>;
}
