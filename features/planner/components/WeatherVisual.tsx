export default function WeatherVisual({ code }: { code: number }) {
  const snow = [71, 73, 75, 77, 85, 86].includes(code);
  const rain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
  const fog = code === 45 || code === 48;
  const cloudy = code !== 0;
  return <svg className="weather-illustration" viewBox="0 0 160 130" aria-hidden="true">
    {code <= 2 && <g className="weather-sun"><circle cx="66" cy="51" r="25" fill="#ffd764" /><path d="M66 8v9m0 69v9M23 51h9m69 0h9M35 20l7 7m49 49l7 7M35 82l7-7m49-49l7-7" stroke="#ffd764" strokeWidth="5" strokeLinecap="round" /></g>}
    {cloudy && <path d="M41 84a22 22 0 0 1 0-44 31 31 0 0 1 59-4 24 24 0 1 1 15 48Z" fill={rain ? "#9ab9ce" : "#e8f4fb"} stroke="#759bb5" strokeWidth="2" />}
    {rain && <g stroke="#2485ce" strokeWidth="5" strokeLinecap="round"><path d="m55 98-5 13m31-13-5 13m31-13-5 13" />{code >= 95 && <path d="m95 45-12 21h15L86 86" stroke="#ffd764" />}</g>}
    {snow && [53, 82, 110].map((x) => <g key={x} stroke="#81bfe2" strokeWidth="3"><path d={`M${x} 96v20m-8-15 16 10m-16 0 16-10`} /></g>)}
    {fog && <path d="M30 93h96M42 104h72M27 115h92" stroke="#759bb5" strokeWidth="5" strokeLinecap="round" />}
    {!Number.isFinite(code) && <text x="80" y="74" textAnchor="middle" fill="currentColor" fontSize="42">?</text>}
  </svg>;
}
