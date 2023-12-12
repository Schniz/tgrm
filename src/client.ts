import { Methods, MethodParameters, MethodReturn } from "./types";

class TelegramError extends Error {
  name = "TelegramError";

  constructor(
    readonly method: string,
    readonly parameters: unknown,
    readonly response: Response,
    readonly responseText: string
  ) {
    super(
      `Telegram API responded with HTTP ${response.status}: ${responseText}`
    );
  }
}

export type ClientResult<Method extends keyof Methods> =
  | { ok: false }
  | { ok: true; result: MethodReturn<Method> };

export async function requestJson<Method extends keyof Methods>(
  { baseUrl, fetch: providedFetch = fetch }: TelegramClientOptions,
  method: Method,
  params: MethodParameters<Method>
): Promise<ClientResult<Method>> {
  const response = await providedFetch(`${baseUrl}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new TelegramError(
      method,
      params,
      response,
      await response.text().catch(() => "Unknown error")
    );
  }

  return response.json() as Promise<
    { ok: false } | { ok: true; result: MethodReturn<Method> }
  >;
}

export async function requestFormData<Method extends keyof Methods>(
  { baseUrl, fetch: providedFetch = fetch }: TelegramClientOptions,
  method: Method,
  formData: FormData
): Promise<ClientResult<Method>> {
  const response = await providedFetch(`${baseUrl}/${method}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new TelegramError(
      method,
      formData,
      response,
      await response.text().catch(() => "Unknown error")
    );
  }

  return response.json() as Promise<
    { ok: false } | { ok: true; result: MethodReturn<Method> }
  >;
}

export type TelegramRequestJsonFunction = <K extends keyof Methods>(
  k: K,
  params: Parameters<Methods[K]>[0]
) => Promise<{ ok: false } | { ok: true; result: ReturnType<Methods[K]> }>;

export type TelegramRequestFormDataFunction = <K extends keyof Methods>(
  k: K,
  fd: FormData
) => Promise<{ ok: false } | { ok: true; result: ReturnType<Methods[K]> }>;

export interface Client {
  requestJson: TelegramRequestJsonFunction;
  requestFormData: TelegramRequestFormDataFunction;
}

export interface TelegramClientOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof fetch;
}

export const createClient = (options: TelegramClientOptions): Client => ({
  requestJson: (k, params) => requestJson(options, k, params),
  requestFormData: (k, fd) => requestFormData(options, k, fd),
});
