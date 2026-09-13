import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';
import { openSupportMenu } from './support-menu';

type ResultEvent = { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> };
type RecognitionDouble = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  starts: number; stops: number; aborts: number;
  onstart: (() => void) | null; onaudiostart: (() => void) | null;
  onresult: ((event: ResultEvent) => void) | null; onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null; onnomatch: (() => void) | null; onspeechend: (() => void) | null;
};
type TrackDouble = { stops: number; stop: () => void };
type StreamDouble = { tracks: TrackDouble[]; getTracks: () => TrackDouble[] };
type AudioDouble = { state: string; closes: number; resume: () => Promise<void>; finishResume: () => void };
type VoiceHarness = {
  recognitions: RecognitionDouble[]; streams: StreamDouble[]; contexts: AudioDouble[];
  permissions: Array<{ constraints: MediaStreamConstraints; grant: () => void; deny: () => void }>;
  amplitudes: number[]; samples: number; connections: number; outputs: number;
  lateResult: RecognitionDouble['onresult'];
};
type VoiceWindow = Window & { voiceHarness: VoiceHarness };
type SetupOptions = { permission?: 'immediate' | 'deferred' | 'denied'; resume?: 'immediate' | 'deferred'; unsupported?: boolean; reduced?: boolean; enterFromHome?: boolean; enterFromPrivacy?: boolean };

test.use({ storageState: { cookies: [], origins: [] } });

async function installMicrophoneDoubles(page: Page, options: SetupOptions) {
  await page.addInitScript(config => {
    const harness: VoiceHarness = { recognitions: [], streams: [], contexts: [], permissions: [],
      amplitudes: Array.from({ length: 24 }, (_, index) => (index % 4) * 8), samples: 0, connections: 0, outputs: 0, lateResult: null };
    (window as unknown as VoiceWindow).voiceHarness = harness;
    class Recognition implements RecognitionDouble {
      lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
      starts = 0; stops = 0; aborts = 0;
      onstart: RecognitionDouble['onstart'] = null; onaudiostart: RecognitionDouble['onaudiostart'] = null;
      onresult: RecognitionDouble['onresult'] = null; onerror: RecognitionDouble['onerror'] = null;
      onend: RecognitionDouble['onend'] = null; onnomatch: RecognitionDouble['onnomatch'] = null; onspeechend: RecognitionDouble['onspeechend'] = null;
      constructor() { harness.recognitions.push(this); }
      start() { this.starts++; this.onstart?.(); }
      stop() { this.stops++; }
      abort() { this.aborts++; }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: config.unsupported ? undefined : Recognition });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: (constraints: MediaStreamConstraints) => new Promise<StreamDouble>((resolve, reject) => {
        const permission = { constraints,
          grant: () => {
            const tracks = Array.from({ length: 2 }, () => ({ stops: 0, stop() { this.stops++; } }));
            const media = { tracks, getTracks: () => tracks }; harness.streams.push(media); resolve(media);
          },
          deny: () => reject(new DOMException('Synthetic microphone denial', 'NotAllowedError')),
        };
        harness.permissions.push(permission);
        if (config.permission === 'denied') permission.deny();
        else if (config.permission !== 'deferred') permission.grant();
      }),
    } });
    class Audio {
      state = 'suspended'; closes = 0; finishResume = () => {};
      destination = { output: true };
      constructor() { harness.contexts.push(this); }
      resume() {
        return new Promise<void>(resolve => {
          this.finishResume = () => { if (this.state !== 'closed') this.state = 'running'; resolve(); };
          if (config.resume !== 'deferred') this.finishResume();
        });
      }
      close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
      createAnalyser() {
        return { fftSize: 512, getByteTimeDomainData(bytes: Uint8Array) {
          harness.samples++;
          for (let index = 0; index < bytes.length; index++) {
            const amplitude = harness.amplitudes[Math.floor(index / 20) % 24] || 0;
            bytes[index] = 128 + (index % 2 ? amplitude : -amplitude);
          }
        } };
      }
      createMediaStreamSource() {
        return { connect(target: { output?: boolean }) { if (target.output) harness.outputs++; else harness.connections++; } };
      }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: Audio });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
  }, options);
}

async function setup(page: Page, options: SetupOptions = {}) {
  await page.emulateMedia({ reducedMotion: options.reduced ? 'reduce' : 'no-preference' });
  await installMicrophoneDoubles(page, options);
  // Every API request is synthetic, including accidental assistant/journey requests.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API only' } }));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  const sent: string[] = [], journey: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/assistant/journey', route => { journey.push(route.request().url()); return route.fulfill({ status: 500, json: { error: 'Voice review cannot create a journey' } }); });
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, persona: '나루' } });
    sent.push(route.request().postDataJSON().messages.at(-1).content);
    return route.fulfill({ json: { reply: '보낸 질문을 확인했어요.', proposal: null, source: 'synthetic' } });
  });
  if (options.enterFromHome || options.enterFromPrivacy) {
    await page.goto(options.enterFromPrivacy ? '/privacy' : '/');
    if (options.enterFromPrivacy) {
      // This case verifies client unmount, not a full document navigation before hydration.
      await expect(page.locator('.preference-controls')).toHaveAttribute('aria-busy', 'false');
      await page.getByRole('navigation', { name: '정책 페이지 이동', exact: true }).getByRole('link', { name: 'WAVE 홈', exact: true }).click();
      await expect(page).toHaveURL(/\/$/);
    }
    // On client navigation the URL can change while the previous page is still visible.
    await expect(page.locator('.wave-header').getByRole('link', { name: '서비스 소개', exact: true })).toHaveAttribute('aria-current', 'page');
    await openSupportMenu(page);
    await expect(page.locator('.preference-controls')).toHaveAttribute('aria-busy', 'false');
    await page.locator('.wave-support-menu > summary').click();
    await expect(page.locator('.wave-support-menu')).not.toHaveAttribute('open', '');
    await page.locator('.wave-header').getByRole('link', { name: '여행 설계', exact: true }).click();
    await expect(page).toHaveURL(/\/planner$/);
  } else await page.goto('/planner');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return { chat, input: chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }),
    mic: chat.getByRole('button', { name: '음성으로 질문 입력', exact: true }), meter: chat.locator('.simple-voice-meter'), sent, journey, errors };
}

const stats = (page: Page) => page.evaluate(() => {
  const h = (window as unknown as VoiceWindow).voiceHarness;
  return { permissions: h.permissions.length, constraints: h.permissions.map(item => item.constraints),
    starts: h.recognitions.map(item => item.starts), stops: h.recognitions.map(item => item.stops), aborts: h.recognitions.map(item => item.aborts),
    trackStops: h.streams.map(media => media.tracks.map(track => track.stops)), contexts: h.contexts.map(item => item.state),
    closes: h.contexts.map(item => item.closes), samples: h.samples, connections: h.connections, outputs: h.outputs };
});
async function emit(page: Page, pieces: Array<{ text: string; final: boolean }>, index = -1) {
  await page.evaluate(({ pieces, index }) => {
    const h = (window as unknown as VoiceWindow).voiceHarness;
    h.recognitions.at(index)?.onresult?.({ resultIndex: 0, results: pieces.map(piece => ({ isFinal: piece.final, 0: { transcript: piece.text } })) });
  }, { pieces, index });
}
async function settleFrames(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    let remaining = 12;
    const frame = () => { if (--remaining) requestAnimationFrame(frame); else resolve(); };
    requestAnimationFrame(frame);
  }));
}
async function released(page: Page, streams: number, contexts: number) {
  await expect.poll(async () => (await stats(page)).trackStops.length).toBe(streams);
  await expect.poll(async () => (await stats(page)).trackStops.every(tracks => tracks.every(stops => stops > 0))).toBe(true);
  await expect.poll(async () => (await stats(page)).contexts).toEqual(Array(contexts).fill('closed'));
  const samples = (await stats(page)).samples;
  await settleFrames(page);
  expect((await stats(page)).samples).toBe(samples);
  expect((await stats(page)).outputs).toBe(0);
}

test('microphone is opt-in; measured amplitude and interim text lead to review before one explicit send', async ({ page }) => {
  const app = await setup(page);
  expect(await stats(page)).toMatchObject({ permissions: 0, starts: [], contexts: [], samples: 0 });
  await app.mic.click();
  await expect(app.meter.locator('.simple-voice-bars span')).toHaveCount(24);
  const first = await app.meter.locator('.simple-voice-bars span').evaluateAll(nodes => nodes.map(node => Number.parseFloat((node as HTMLElement).style.height)));
  expect(new Set(first).size).toBeGreaterThan(1);
  await page.evaluate(() => { (window as unknown as VoiceWindow).voiceHarness.amplitudes.fill(32); });
  await expect.poll(() => app.meter.locator('.simple-voice-bars span').evaluateAll(nodes => nodes.every(node => (node as HTMLElement).style.height === '32px'))).toBe(true);
  expect(await stats(page)).toMatchObject({ permissions: 1, constraints: [{ audio: true }], starts: [1], connections: 1, outputs: 0 });
  expect(await page.evaluate(() => { const r = (window as unknown as VoiceWindow).voiceHarness.recognitions[0]; return { lang: r.lang, interim: r.interimResults }; })).toEqual({ lang: 'ko-KR', interim: true });
  await emit(page, [{ text: '창원에서 ', final: true }, { text: '쉬엄쉬엄', final: false }]);
  await expect(app.meter.getByLabel('인식 중인 말')).toHaveText('창원에서 쉬엄쉬엄');
  await expect(app.input).toHaveValue('');
  expect(app.sent).toEqual([]);
  await emit(page, [{ text: '창원에서 쉬엄쉬엄 여행하고 싶어요.', final: true }]);
  await expect(app.input).toHaveValue('창원에서 쉬엄쉬엄 여행하고 싶어요.');
  await expect(app.meter).toHaveCount(0);
  await released(page, 1, 1);
  expect(app.sent).toEqual([]);
  await app.chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect.poll(() => app.sent).toEqual(['창원에서 쉬엄쉬엄 여행하고 싶어요.']);
  expect(app.journey).toEqual([]); expect(app.errors).toEqual([]);
});

test('explicit stop releases live audio immediately and a later final result remains an unsent draft', async ({ page }) => {
  const app = await setup(page);
  await app.mic.click(); await expect(app.meter.locator('.simple-voice-bars span')).toHaveCount(24);
  await app.meter.getByRole('button', { name: '듣기 완료', exact: true }).click();
  await expect(app.meter).toHaveAttribute('data-phase', 'processing');
  await expect(app.meter.getByRole('button', { name: '듣기 완료', exact: true })).toBeDisabled();
  await released(page, 1, 1);
  expect((await stats(page)).stops).toEqual([1]);
  await emit(page, [{ text: '출발 시간을 열한 시로 바꿔줘.', final: true }]);
  await expect(app.input).toHaveValue('출발 시간을 열한 시로 바꿔줘.');
  expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('stop before microphone permission resolves disposes the late stream without starting an analyser', async ({ page }) => {
  const app = await setup(page, { permission: 'deferred' });
  await app.mic.click(); await expect.poll(async () => (await stats(page)).permissions).toBe(1);
  await app.meter.getByRole('button', { name: '듣기 완료', exact: true }).click();
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceHarness.permissions[0].grant());
  await released(page, 1, 0);
  expect((await stats(page)).samples).toBe(0);
  await emit(page, [{ text: '들은 말 확인', final: true }]);
  await expect(app.input).toHaveValue('들은 말 확인');
  expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('cancel rejects late speech and permission from the old session while preserving the new session', async ({ page }) => {
  const app = await setup(page, { permission: 'deferred' });
  await app.input.fill('직접 쓰던 질문'); await app.mic.click();
  await page.evaluate(() => { const h = (window as unknown as VoiceWindow).voiceHarness; h.lateResult = h.recognitions[0].onresult; });
  await app.meter.getByRole('button', { name: '취소', exact: true }).click();
  await app.mic.click();
  await page.evaluate(() => { const h = (window as unknown as VoiceWindow).voiceHarness; h.permissions[0].grant(); h.lateResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '오래된 질문' } }] }); });
  await expect(app.input).toHaveValue('직접 쓰던 질문');
  await expect.poll(async () => (await stats(page)).trackStops[0]?.every(count => count > 0)).toBe(true);
  expect((await stats(page)).contexts).toEqual([]);
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceHarness.permissions[1].grant());
  await expect(app.meter.locator('.simple-voice-bars span')).toHaveCount(24);
  await emit(page, [{ text: '새 세션 질문', final: true }]);
  await expect(app.input).toHaveValue('새 세션 질문');
  await released(page, 2, 1);
  expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('hiding the document stops both microphone tracks and rejects a previously captured result callback', async ({ page }) => {
  const app = await setup(page); await app.input.fill('남겨 둔 질문'); await app.mic.click();
  await expect(app.meter.locator('.simple-voice-bars span')).toHaveCount(24);
  await page.evaluate(() => {
    const h = (window as unknown as VoiceWindow).voiceHarness; h.lateResult = h.recognitions[0].onresult;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(app.meter).toHaveCount(0); await released(page, 1, 1);
  await page.evaluate(() => {
    (window as unknown as VoiceWindow).voiceHarness.lateResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '숨긴 뒤 도착한 질문' } }] });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(app.input).toHaveValue('남겨 둔 질문'); expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('closing the panel before permission resolves cleans up the late stream and retains the typed draft', async ({ page }) => {
  const app = await setup(page, { permission: 'deferred' });
  await app.input.fill('닫기 전 초안'); await app.mic.click();
  await app.chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(app.chat).toBeHidden();
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceHarness.permissions[0].grant());
  await released(page, 1, 0);
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await expect(app.input).toHaveValue('닫기 전 초안'); await expect(app.meter).toHaveCount(0);
  expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('supported client navigation keeps one global conversation but cancels its microphone and rejects late speech', async ({ page }) => {
  const app = await setup(page, { permission: 'deferred', enterFromHome: true });
  await app.input.fill('소개에서도 이어 쓸 초안'); await app.mic.click();
  await page.evaluate(() => { const h = (window as unknown as VoiceWindow).voiceHarness; h.lateResult = h.recognitions[0].onresult; });
  // Browser Back is real navigation while the modal makes background links inert.
  await page.goBack();
  await expect(page).toHaveURL(/\/$/); await expect(app.chat).toBeVisible();
  await expect(page.locator('.naru-panel')).toHaveCount(1);
  await expect(app.chat.locator('.naru-page-context')).toContainText('서비스 소개');
  await expect(app.input).toHaveValue('소개에서도 이어 쓸 초안');
  expect(await stats(page)).toMatchObject({ permissions: 1, starts: [1], aborts: [1], trackStops: [] });
  await page.evaluate(() => {
    const h = (window as unknown as VoiceWindow).voiceHarness; h.permissions[0].grant();
    h.lateResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '이동 전에 듣던 음성' } }] });
  });
  await expect(app.input).toHaveValue('소개에서도 이어 쓸 초안'); await released(page, 1, 0);
  await expect(app.meter).toHaveCount(0);
  await app.chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await expect(app.input).toHaveValue('소개에서도 이어 쓸 초안');
  expect(app.sent).toEqual([]); expect(app.journey).toEqual([]); expect(app.errors).toEqual([]);
});

test('leaving supported routes unmounts the global voice session and rejects its late permission and captured result', async ({ page }) => {
  const app = await setup(page, { permission: 'deferred', enterFromPrivacy: true });
  await app.input.fill('기기를 떠난 뒤 보내지 않을 질문'); await app.mic.click();
  await page.evaluate(() => { const h = (window as unknown as VoiceWindow).voiceHarness; h.lateResult = h.recognitions[0].onresult; });
  await page.goBack();
  await expect(page).toHaveURL(/\/$/); await expect(app.chat).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/privacy$/); await expect(page.locator('.naru-panel')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean((window as unknown as VoiceWindow).voiceHarness))).toBe(true);
  expect(await stats(page)).toMatchObject({ permissions: 1, aborts: [1], trackStops: [] });
  await page.evaluate(() => {
    const h = (window as unknown as VoiceWindow).voiceHarness; h.permissions[0].grant();
    h.lateResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '페이지를 떠난 뒤 도착한 질문' } }] });
  });
  await released(page, 1, 0);
  expect((await stats(page)).aborts).toEqual([1]);
  expect(app.sent).toEqual([]); expect(app.journey).toEqual([]); expect(app.errors).toEqual([]);
});

test('unsupported recognition never requests microphone permission and leaves the typed send path usable', async ({ page }) => {
  const app = await setup(page, { unsupported: true }); await app.mic.click();
  await expect(app.chat.getByRole('status')).toContainText('음성 입력을 지원하지 않아요');
  await expect(app.meter).toHaveCount(0);
  expect(await stats(page)).toMatchObject({ permissions: 0, starts: [], contexts: [], samples: 0 });
  await app.input.fill('글로 작성한 질문'); await app.chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect.poll(() => app.sent).toEqual(['글로 작성한 질문']); expect(app.errors).toEqual([]);
});

test('recognition permission errors release audio, announce the error and preserve the existing draft', async ({ page }) => {
  const app = await setup(page); await app.input.fill('잃으면 안 되는 초안'); await app.mic.click();
  await expect(app.meter.locator('.simple-voice-bars span')).toHaveCount(24);
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceHarness.recognitions[0].onerror?.({ error: 'not-allowed' }));
  await expect(app.chat.getByRole('status')).toContainText('마이크 사용을 허용해 주세요');
  await expect(app.meter).toHaveCount(0); await released(page, 1, 1);
  await expect(app.input).toHaveValue('잃으면 안 되는 초안'); await expect(app.input).toBeEditable();
  expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('denied meter access is explicitly unavailable and never fabricates bars while recognition can still finish', async ({ page }) => {
  const app = await setup(page, { permission: 'denied' }); await app.mic.click();
  await expect(app.meter).toContainText('소리 크기는 표시할 수 없어요.');
  await expect(app.meter.locator('.simple-voice-bars')).toHaveCount(0);
  expect(await stats(page)).toMatchObject({ permissions: 1, contexts: [], samples: 0 });
  await emit(page, [{ text: '파형 없이 ', final: true }, { text: '인식하는 중', final: false }]);
  await expect(app.meter.getByLabel('인식 중인 말')).toHaveText('파형 없이 인식하는 중');
  await emit(page, [{ text: '파형 없이 인식 완료', final: true }]);
  await expect(app.input).toHaveValue('파형 없이 인식 완료');
  expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('stopping while AudioContext.resume is pending closes the context and prevents late analyser creation', async ({ page }) => {
  const app = await setup(page, { resume: 'deferred' }); await app.mic.click();
  await expect.poll(async () => (await stats(page)).contexts).toEqual(['suspended']);
  await app.meter.getByRole('button', { name: '듣기 완료', exact: true }).click();
  await released(page, 1, 1);
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceHarness.contexts[0].finishResume());
  await settleFrames(page);
  expect(await stats(page)).toMatchObject({ contexts: ['closed'], samples: 0, connections: 0, outputs: 0 });
  await emit(page, [{ text: '완료 후 검토할 말', final: true }]);
  await expect(app.input).toHaveValue('완료 후 검토할 말'); expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});

test('reduced motion keeps a truthful silent meter, usable controls and recovery when sound resumes', async ({ page }) => {
  const app = await setup(page, { reduced: true });
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceHarness.amplitudes.fill(0));
  await app.mic.click(); await expect(app.meter.locator('.simple-voice-bars span')).toHaveCount(24);
  await expect(app.meter).toHaveAttribute('data-phase', 'silence');
  await expect(app.chat.getByRole('status')).toContainText('소리가 들리지 않아요');
  expect(await app.meter.locator('.simple-voice-bars span').evaluateAll(nodes => nodes.every(node => {
    const style = getComputedStyle(node); return (node as HTMLElement).style.height === '2px' && style.animationName === 'none';
  }))).toBe(true);
  for (const label of ['듣기 완료', '취소']) {
    const button = app.meter.getByRole('button', { name: label, exact: true });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceHarness.amplitudes.fill(16));
  await expect(app.meter).toHaveAttribute('data-phase', 'listening');
  await expect.poll(() => app.meter.locator('.simple-voice-bars span').evaluateAll(nodes => nodes.every(node => Number.parseFloat((node as HTMLElement).style.height) > 2))).toBe(true);
  const cancel = app.meter.getByRole('button', { name: '취소', exact: true }); await cancel.focus(); await expect(cancel).toBeFocused(); await page.keyboard.press('Enter');
  await expect(app.meter).toHaveCount(0); await released(page, 1, 1);
  expect(app.sent).toEqual([]); expect(app.errors).toEqual([]);
});
