import { type AuthWebOptions, createAuthWeb } from "./index";

export function createTanstackAuthHandler(options: AuthWebOptions) {
  const app = createAuthWeb(options);

  return async function tanstackAuthHandler(request: Request): Promise<Response> {
    return app.handleRequest(request);
  };
}
