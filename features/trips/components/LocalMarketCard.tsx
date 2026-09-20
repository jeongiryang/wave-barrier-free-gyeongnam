import type { TravelBook } from '../../../lib/travel-book.js';
import { localMarkets } from '../local-market';

export default function LocalMarketCard({ books }: { books: TravelBook[] }) {
  const regions = new Set(books.filter(book => book.status === 'visited').flatMap(book => book.places.map(place => place.city).filter(Boolean)));
  const markets = localMarkets.filter(market => market.regions.some(region => regions.has(region)));
  if (!markets.length) return null;
  return <section className="local-market-card" aria-labelledby="local-market-title"><h2 id="local-market-title">이 지역 상품 보기</h2><p>W.A.V.E는 상품을 팔지 않아요. 판매처로 이동해요.</p><ul>{markets.map(market => <li key={market.id}><div><strong>{market.name}</strong><span>{market.operator}</span><small>확인한 날짜 {market.checkedOn}</small></div><a href={market.url} target="_blank" rel="noopener noreferrer">공식 판매처 열기</a></li>)}</ul><small>상품·가격·재고와 거래 조건은 판매처에서 직접 확인해 주세요.</small></section>;
}
