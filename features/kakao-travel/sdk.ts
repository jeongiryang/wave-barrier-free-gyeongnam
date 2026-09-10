type KakaoSdk = { init: (key: string) => void; isInitialized: () => boolean; Share?: { sendDefault: (template: unknown) => void } };
declare global { interface Window { Kakao?: KakaoSdk } }
let loading: Promise<KakaoSdk> | undefined;
export function loadKakaoShare(): Promise<KakaoSdk> {
  if (loading) return loading;
  loading = (async () => {
    const response = await fetch("/api/kakao/share", { credentials: "same-origin" });
    const config = await response.json();
    if (!response.ok || !/^[a-f0-9]{32}$/i.test(config.javascriptKey || "")) throw new Error("카카오 공유를 준비하지 못했습니다. 공유 링크를 복사해 이용해 주세요.");
    if (!window.Kakao) await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
      script.integrity = "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy";
      script.crossOrigin = "anonymous"; script.async = true;
      const timer = setTimeout(() => { script.remove(); reject(new Error("카카오 공유 로딩이 지연되고 있어요. 다시 준비해 주세요.")); }, 12000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("카카오 공유를 불러오지 못했어요.")); };
      document.head.appendChild(script);
    });
    const sdk = window.Kakao;
    if (!sdk) throw new Error("카카오 공유를 다시 준비해 주세요.");
    if (!sdk.isInitialized()) sdk.init(config.javascriptKey);
    if (!sdk.Share) throw new Error("카카오 공유를 다시 준비해 주세요.");
    return sdk;
  })().catch(error => { loading = undefined; throw error; });
  return loading;
}
