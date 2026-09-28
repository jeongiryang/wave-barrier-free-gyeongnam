import { regionBoundaries } from "../region-boundaries";
export default function JourneyPaperMap({region}:{region:string}) {
 const point=regionBoundaries.find(area=>area.name===region)!;
 return <svg className="journey-paper-map" viewBox="0 0 1536 1024" role="img" aria-label={`나루와 꼬마 여행자가 가리키는 지도: ${region}`}>
            {/* Project the live map onto the illustrated paper, below their hands. */}
            <g transform="matrix(.78 0 -.08 .245 480 762)">
              {regionBoundaries.map((area,i)=><path key={area.name} d={area.path} fillRule="evenodd" data-tone={i%4} data-featured={area.name===region}/>) }
            </g>
            <path className="journey-map-waves" d="M540 931q8-5 16 0t16 0m45 12q8-5 16 0t16 0m133-5q8-5 16 0t16 0m30-18q8-5 16 0t16 0"/>
            <g className="journey-map-labels">{regionBoundaries.filter(area=>area.name!==region).map(area=><g key={area.name} transform={`translate(${480+area.x*.78-area.y*.08} ${762+area.y*.245})`}><ellipse rx="3" ry="1.7"/><text x="0" y="-5" textAnchor="middle">{area.name}</text></g>)}</g>
            <g key={region} transform={`translate(${480 + point.x * .78 - point.y * .08} ${762 + point.y * .245}) scale(.82)`}>
              <g className="journey-marker-lift"><path className="journey-pin-face" d="M0 0C-7-12-25-29-25-46a25 25 0 1 1 50 0C25-29 7-12 0 0Z"/><circle className="journey-pin-center" cx="0" cy="-46" r="9"/><rect className="journey-pin-label" x="32" y="-66" width="108" height="40" rx="12"/><text className="journey-pin-name" x="86" y="-36" textAnchor="middle">{region}</text></g>
            </g>
          </svg>;
}
