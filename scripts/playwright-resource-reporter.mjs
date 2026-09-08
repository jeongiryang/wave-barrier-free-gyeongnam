import { statfsSync } from "node:fs";

// Report aggregate capacities only. Never enumerate files, environment variables,
// URLs, test payloads or error messages from the credential-free validation job.
export function diskCapacity(statfs = statfsSync) {
  return Object.fromEntries(Object.entries({ workspace: "/workspace", temporary: "/tmp", shared: "/dev/shm", home: "/home/runner" }).map(([name, location]) => {
    try {
      const value = statfs(location);
      return [name, { bytes: value.blocks * value.bsize, availableBytes: value.bavail * value.bsize, inodes: value.files, availableInodes: value.ffree }];
    } catch { return [name, { available: false }]; }
  }));
}

export default class ResourceReporter {
  samples = 0;
  report(phase) {
    if (this.samples++ >= 64) return;
    console.log(JSON.stringify({ event: "wave-public-disk-capacity", phase, mounts: diskCapacity() }));
  }
  onStepEnd(_test, _result, step) {
    if (step.error) this.report("failed-step");
  }
  onTestEnd(_test, result) {
    if (["failed", "timedOut", "interrupted"].includes(result.status)) this.report("failed-test");
  }
}
