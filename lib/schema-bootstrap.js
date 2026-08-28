/**
 * 런타임 인스턴스당 한 번만 스키마 준비를 실행한다.
 *
 * 준비 Promise를 캐시하면 요청마다 DDL 왕복이 붙지 않는다. 다만 **거부된**
 * Promise까지 캐시하면 그 인스턴스는 회수될 때까지 모든 요청에 같은 오류를
 * 돌려준다. Neon 콜드스타트 지연 한 번으로 그 인스턴스의 커뮤니티나 공유 여행이
 * 통째로 막히고, 다른 인스턴스는 멀쩡하므로 "가끔 안 된다"로만 보여 재현하기
 * 어렵다. 성공만 재사용하고, 실패는 다음 요청이 다시 시도하게 한다.
 *
 * @template T
 * @param {() => Promise<T>} prepare
 * @returns {() => Promise<T>}
 */
export function createSchemaBootstrap(prepare) {
  /** @type {Promise<T> | null} */
  let ready = null;
  return function bootstrap() {
    if (ready) return ready;
    // prepare가 동기적으로 던져도 거부로 다루도록 한 틱 뒤에 실행한다.
    const started = Promise.resolve().then(prepare);
    ready = started;
    started.catch(() => {
      if (ready === started) ready = null;
    });
    return started;
  };
}
