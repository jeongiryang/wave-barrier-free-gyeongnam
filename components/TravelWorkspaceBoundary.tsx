'use client';
import { Component, type ReactNode } from 'react';

/** A failed optional planner chunk must not take the surrounding page with it. */
export default class TravelWorkspaceBoundary extends Component<{ children: ReactNode; onClose: () => void; embedded: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="travel-workspace-error" role="alert">
      <p>여행 화면을 불러오지 못했어요. 저장한 일정은 그대로 있어요.</p>
      <button type="button" onClick={() => window.location.reload()}>다시 불러오기</button>
      {this.props.embedded && <button type="button" onClick={this.props.onClose} title="닫기"><span aria-hidden="true">×</span><span className="sr-only">닫기</span></button>}
    </section>;
  }
}
