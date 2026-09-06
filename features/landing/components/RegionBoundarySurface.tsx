import { regionBoundaries } from "../region-boundaries";
import { regionNames } from "../../../lib/gyeongnam-region-names";

export interface RegionBoundarySurfaceProps {
  selected: string;
  preview: string | null;
  english: boolean;
  onSelect: (name: string) => void;
  onPreview: (name: string) => void;
  onLeave: (name: string) => void;
}

export default function RegionBoundarySurface({ selected, preview, english, onSelect, onPreview, onLeave }: RegionBoundarySurfaceProps) {
  const highlighted = regionBoundaries.find((region) => region.name === (preview || selected));
  return <svg className="region-boundary-surface" viewBox="0 0 800 814" role="img" aria-label={english ? `Gyeongnam's 18 city and county boundaries, selected ${regionNames[selected]}` : `경상남도 18개 시·군 경계, 선택 지역 ${selected}`}>
    {regionBoundaries.map((region) => <path key={region.name} d={region.path} fillRule="evenodd"
      data-region-boundary={region.name} data-selected={region.name === selected} data-preview={region.name === preview}
      onClick={() => onSelect(region.name)} onPointerEnter={() => onPreview(region.name)} onPointerLeave={() => onLeave(region.name)}
    />)}
    {highlighted && <g className="region-boundary-label" aria-hidden="true" transform={`translate(${highlighted.x},${highlighted.y})`}>
      <circle r="8" /><text y="-19" textAnchor="middle">{english ? regionNames[highlighted.name] : highlighted.name}</text>
    </g>}
  </svg>;
}
