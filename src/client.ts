import {
  Methods,
  MethodParameters,
  MethodReturn,
  FormDataParameters,
} from "./types";

/**
 * Thrown when the Telegram API responds with an error.
 */
class TelegramError extends Error {
  name = "TelegramError";

  constructor(
    /** The method that was called. */
    readonly method: string,
    /** The parameters that were passed to the method. */
    readonly parameters: unknown,
    /**
     * The response from the Telegram API.
     * Its body is already consumed and available in {@link TelegramError.responseText}
     */
    readonly response: Response,
    /** The response text from the Telegram API. */
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

/**
 * Make a request to the Telegram API.
 */
export async function request<Method extends keyof Methods>(
  { baseUrl, fetch: providedFetch = fetch }: TelegramClientOptions,
  method: Method,
  params: MethodParameters<Method> | FormData
): Promise<ClientResult<Method>> {
  const response = await providedFetch(`${baseUrl}/${method}`, {
    method: "POST",
    headers: {
      ...(!(params instanceof FormData) && {
        "Content-Type": "application/json",
      }),
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

/**
 * A function that makes a request to the Telegram API.
 */
export type TelegramRequestFn = <K extends keyof Methods>(
  k: K,
  params: MethodParameters<K> | FormData
) => Promise<{ ok: false } | { ok: true; result: ReturnType<Methods[K]> }>;

/**
 * A Telegram client.
 */
export interface Client {
  request: TelegramRequestFn;
}

type TokenOrBaseUrl =
  | { token?: never; baseUrl: string | URL }
  | { token: string; baseUrl?: never };

export type UserTelegramClientOptions = Omit<TelegramClientOptions, "baseUrl"> &
  TokenOrBaseUrl;

/**
 * Normalizes {@link UserTelegramClientOptions} to {@link TelegramClientOptions}
 * so the client can be created.
 */
export function normalizeOptions(
  options: UserTelegramClientOptions
): TelegramClientOptions {
  const baseUrl = options.baseUrl
    ? String(options.baseUrl)
    : `https://api.telegram.org/bot${options.token}`;
  return {
    ...options,
    baseUrl,
  };
}

export interface TelegramClientOptions {
  readonly baseUrl: string;
  /** A custom fetch function. Defaults to the global `fetch`. */
  readonly fetch?: typeof fetch;
}

export const createClient = (
  userOptions: UserTelegramClientOptions
): Client => {
  const options = normalizeOptions(userOptions);
  return {
    request: (k, params) => request(options, k, params),
  };
};

export function buildFormDataFor<M extends keyof Methods>(
  params: FormDataParameters<M>
): FormData {
  const fd = new FormData();

  for (const [key, value] of Object.entries(params as object)) {
    if (value && value instanceof File) {
      fd.append(key, value, value.name);
    } else {
      fd.append(key, value as any);
    }
  }

  return fd;
}
