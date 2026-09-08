import { test as base, expect } from "@playwright/test";
import { isReadOnlyMethod, validateProductionOrigin } from "../lib/production-read-only";

export const test = base.extend<{ readOnlyGuard: void }>({
  readOnlyGuard: [async ({ context }, runFixture) => {
    const blocked: string[] = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (!isReadOnlyMethod(request.method())) {
        // Do not retain query strings, bodies, cookies or user identifiers.
        blocked.push(`${request.method()} ${new URL(request.url()).pathname}`);
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
    await runFixture();
    expect(blocked, "Production browser must never attempt writes").toEqual([]);
  }, { auto: true }],
  request: async ({ playwright }, runFixture) => {
    const api = await playwright.request.newContext({ baseURL: validateProductionOrigin(process.env.E2E_BASE_URL) });
    const readOnlyApi = new Proxy(api, {
      get(target, property) {
        if (["post", "put", "patch", "delete"].includes(String(property))) {
          return () => { throw new Error("Production API writes are prohibited"); };
        }
        if (property === "fetch") return (url: string, options?: { method?: string }) => {
          if (!isReadOnlyMethod(options?.method)) throw new Error("Production API writes are prohibited");
          return target.fetch(url, options);
        };
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await runFixture(readOnlyApi);
    await api.dispose();
  },
});

export { expect };
