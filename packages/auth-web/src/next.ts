import { type AuthWebOptions, createAuthWeb } from "./index";

export function createNextAuthHandlers(options: AuthWebOptions) {
  const app = createAuthWeb(options);

  async function handler(request: Request): Promise<Response> {
    return app.handleRequest(request);
  }

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}
