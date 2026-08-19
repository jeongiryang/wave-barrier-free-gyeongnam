export type WeatherPoint = { lat: number; lng: number };

const regionCoordinates: Record<string, WeatherPoint> = {
  "경남 전체": { lat: 35.2383, lng: 128.6924 }, 창원: { lat: 35.2279, lng: 128.6811 }, 진주: { lat: 35.1800, lng: 128.1076 },
  통영: { lat: 34.8544, lng: 128.4332 }, 사천: { lat: 35.0038, lng: 128.0642 }, 김해: { lat: 35.2285, lng: 128.8893 },
  밀양: { lat: 35.5038, lng: 128.7464 }, 거제: { lat: 34.8806, lng: 128.6211 }, 양산: { lat: 35.3350, lng: 129.0372 },
  의령: { lat: 35.3222, lng: 128.2617 }, 함안: { lat: 35.2725, lng: 128.4065 }, 창녕: { lat: 35.5446, lng: 128.4923 },
  고성: { lat: 34.9731, lng: 128.3223 }, 남해: { lat: 34.8377, lng: 127.8925 }, 하동: { lat: 35.0672, lng: 127.7513 },
  산청: { lat: 35.4156, lng: 127.8735 }, 함양: { lat: 35.5205, lng: 127.7252 }, 거창: { lat: 35.6867, lng: 127.9095 }, 합천: { lat: 35.5667, lng: 128.1658 },
};

export function resolveWeatherRegion(requested: string) {
  const region = regionCoordinates[requested] ? requested : "창원";
  return { region, point: regionCoordinates[region] };
}
