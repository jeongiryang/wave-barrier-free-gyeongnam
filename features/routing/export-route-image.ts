import type { MapPlace, RouteAlternative, RoutePoint } from "./types";

type RouteImageFormat = "png" | "jpeg";

export async function exportRouteImage({
  origin,
  places,
  route,
  format,
  locale = "ko",
}: {
  origin: RoutePoint;
  places: MapPlace[];
  route: RouteAlternative | null;
  format: RouteImageFormat;
  locale?: "ko" | "en";
}) {
  try {
    const english = locale === "en";
    const validPlaces = places.filter((place) => Number.isFinite(Number(place.mapX)) && Number.isFinite(Number(place.mapY)));
    const geometry = route?.geometry?.length
      ? route.geometry
      : [{ lat: origin.lat, lng: origin.lng }, ...validPlaces.map((place) => ({ lat: Number(place.mapY), lng: Number(place.mapX) }))];
    const points = geometry.length > 1
      ? geometry
      : [{ lat: origin.lat, lng: origin.lng }];
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    if (!context) return false;

    context.fillStyle = format === "jpeg" ? "#f7fcfe" : "#e6f4fb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(23,105,255,.16)");
    gradient.addColorStop(.55, "rgba(128,232,199,.12)");
    gradient.addColorStop(1, "rgba(7,31,53,.04)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(48,92,121,.11)";
    context.lineWidth = 1;
    for (let x = 80; x < canvas.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 150);
      context.lineTo(x, 900);
      context.stroke();
    }
    for (let y = 180; y < 900; y += 80) {
      context.beginPath();
      context.moveTo(80, y);
      context.lineTo(1520, y);
      context.stroke();
    }

    const allPoints = [origin, ...points, ...validPlaces.map((place) => ({ lat: Number(place.mapY), lng: Number(place.mapX) }))];
    const minLat = Math.min(...allPoints.map((point) => point.lat));
    const maxLat = Math.max(...allPoints.map((point) => point.lat));
    const minLng = Math.min(...allPoints.map((point) => point.lng));
    const maxLng = Math.max(...allPoints.map((point) => point.lng));
    const latSpan = Math.max(maxLat - minLat, .008);
    const lngSpan = Math.max(maxLng - minLng, .008);
    const project = (point: RoutePoint) => ({
      x: 140 + ((point.lng - minLng) / lngSpan) * 1320,
      y: 210 + (1 - (point.lat - minLat) / latSpan) * 610,
    });
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(7,31,53,.18)";
    context.lineWidth = 20;
    context.beginPath();
    points.forEach((point, index) => {
      const projected = project(point);
      if (index) context.lineTo(projected.x, projected.y);
      else context.moveTo(projected.x, projected.y);
    });
    context.stroke();
    context.strokeStyle = "#0a6baf";
    context.lineWidth = 11;
    context.beginPath();
    points.forEach((point, index) => {
      const projected = project(point);
      if (index) context.lineTo(projected.x, projected.y);
      else context.moveTo(projected.x, projected.y);
    });
    context.stroke();

    const drawPin = (point: RoutePoint, label: string, rank: string, primary = false) => {
      const projected = project(point);
      context.beginPath();
      context.arc(projected.x, projected.y, primary ? 28 : 24, 0, Math.PI * 2);
      context.fillStyle = primary ? "#06304a" : "#0a6baf";
      context.fill();
      context.lineWidth = 8;
      context.strokeStyle = "#ffffff";
      context.stroke();
      context.fillStyle = "#ffffff";
      context.font = "800 22px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(rank, projected.x, projected.y + 1);
      const width = Math.min(340, Math.max(150, context.measureText(label).width + 42));
      const boxX = Math.min(1510 - width, Math.max(90, projected.x - width / 2));
      const boxY = projected.y < 300 ? projected.y + 42 : projected.y - 76;
      context.fillStyle = "rgba(255,255,255,.96)";
      context.beginPath();
      context.roundRect(boxX, boxY, width, 43, 13);
      context.fill();
      context.fillStyle = "#0f4f70";
      context.font = "750 18px system-ui, sans-serif";
      context.fillText(label, boxX + width / 2, boxY + 22);
    };
    drawPin({ lat: origin.lat, lng: origin.lng }, english ? "Starting point" : "출발지", "S", true);
    validPlaces.slice(0, 6).forEach((place, index) => drawPin(
      { lat: Number(place.mapY), lng: Number(place.mapX) },
      place.name,
      String(index + 1),
    ));

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = "#0a6baf";
    context.font = "900 22px system-ui, sans-serif";
    context.fillText("W.A.V.E ROUTE MAP", 86, 70);
    context.fillStyle = "#06304a";
    context.font = "850 46px system-ui, sans-serif";
    context.fillText(english ? "Gyeongnam journey schematic" : "경남 여행 장소 안내도", 86, 124);
    context.fillStyle = "#52788c";
    context.font = "650 20px system-ui, sans-serif";
    const summary = [
      english ? "Journey overview · original place names" : "여행 장소와 선택한 이동 구간",
      route?.configured && Number.isFinite(route.totalTime) && route.totalTime > 0 ? `${route.totalTime}${english ? " min (estimate)" : "분 (예상)"}` : null,
    ].filter(Boolean).join(" · ");
    context.fillText(summary, 86, 160);
    context.fillStyle = "rgba(7,31,53,.82)";
    context.fillRect(80, 884, 1440, 70);
    context.fillStyle = "#ffffff";
    context.font = "700 18px system-ui, sans-serif";
    context.fillText(english ? `${validPlaces.length} ${validPlaces.length === 1 ? "place" : "places"} · Schematic · not for navigation · not an accessible-route guarantee` : `${validPlaces.length}개 여행지 · 장소 연결 안내도이며 실제 길 안내·무장애 이동을 보장하지 않습니다.`, 112, 913);
    context.fillStyle = "#bcd9e8";
    context.font = "600 16px system-ui, sans-serif";
    context.fillText(english ? "Map tiles excluded · check the journey and each place before departure" : "지도 배경 미포함 · 출발 전 이동 경로와 각 장소 정보를 다시 확인하세요.", 112, 940);
    return await new Promise<boolean>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(false); return; }
        let url: string | undefined;
        try {
          url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `wave-route-map.${format === "jpeg" ? "jpg" : "png"}`;
          anchor.click();
          resolve(true);
        } catch { resolve(false); }
        finally { if (url) { const imageUrl = url; window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1000); } }
      }, `image/${format}`, .94);
    });
  } catch { return false; }
}
