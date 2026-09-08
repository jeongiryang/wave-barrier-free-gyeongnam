// Enable only process-level diagnostics in the existing credential-free CI view.
// This path check selects logging; it is not proof of the sandbox boundary.
// Do not enable pw:api/pw:protocol, dump environment or copy authentication.
if (process.env.CI && process.cwd() === "/workspace" && process.env.PLAYWRIGHT_BROWSERS_PATH === "/browsers") {
  process.env.DEBUG = "pw:browser";
}

// Import the installed official CLI in this process, after DEBUG is configured.
// Keep all caller arguments, exit behavior, workers, retries and timeouts intact.
process.argv.splice(2, 0, "test");
await import("@playwright/test/cli");
