import {
  Methods,
  MethodParameters,
  MethodReturn,
  FormDataParameters,
  Method,
} from "./types";

/**
 * Thrown when the Telegram API responds with an error.
 *
 * @example
 * ```typescript
 * try {
 *  await client.request("sendMessage", { chat_id: 123, text: "Hello" });
 *  console.log("Message sent!");
 * } catch (err) {
 *   if (err instanceof TelegramError) {
 *     console.log("Telegram responded with an error:");
 *     console.log(err.response);
 *     console.log(err.responseText);
 *   }
 *   throw err;
 * }
 * ```
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

/**
 * A result of the `client.request` function.
 *
 * @example
 * ```typescript
 * const response = await client.request("sendMessage", { chat_id: 123, text: "Hello" });
 *
 * if (response.ok) {
 *   console.log(response.result.message_id);
 * }
 * ```
 *
 * @group Helpers
 */
export type ClientResult<Method extends keyof Methods> =
  | { ok: false }
  | { ok: true; result: MethodReturn<Method> };

/**
 * Make a request to the Telegram API.
 *
 * @group Free functions
 */
export async function request<Method extends keyof Methods>(
  { baseUrl, fetch: providedFetch = fetch }: ResolvedTelegramClientOptions,
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
    body: params instanceof FormData ? params : JSON.stringify(params),
  });

  if (!response.ok) {
    throw new TelegramError(
      method,
      params,
      response,
      await response.text().catch(() => "Unknown error")
    );
  }

  return response.json() as Promise<ClientResult<Method>>;
}

/**
 * A Telegram client that is bounded to a token/url.
 *
 * @group Client
 */
export interface Client {
  /**
   * Make a request to the Telegram API.
   *
   * @param method The method to call
   *
   * @param params The parameters to pass to the method. If you want to call a {@link Method} that accepts a file,
   * like `sendDocument`, you can pass a `File` object by sending a {@link FormData} object instead of a plain object.
   * See {@link buildFormDataFor} for a type-safe way to build a {@link FormData} object for a specific Telegram API method.
   *
   * @returns The result of the method call
   *
   * @template Method the method to call. This should be inferred from usage. See example below.
   *
   * @example
   * ```typescript
   * const response = await client.request("sendMessage", { chat_id: 123, text: "Hello" });
   * if (response.ok) {
   *   console.log(response.result.message_id);
   * }
   * ```
   *
   * @example
   * ```typescript
   * const response = await client.request(
   *   "sendDocument",
   *   buildFormDataFor<"sendDocument">({
   *     chat_id: 123,
   *     document: new File(["hello"], "hello.txt")
   *   })
   * );
   *
   * if (response.ok) {
   *   console.log(response.result.message_id);
   * }
   * ```
   */
  request<Method extends keyof Methods>(
    method: Method,
    params: MethodParameters<Method> | FormData
  ): Promise<ClientResult<Method>>;
}

type TokenOrBaseUrl =
  | { token?: never; baseUrl: string | URL }
  | { token: string; baseUrl?: never };

/**
 * Options for the Telegram client.
 * Either a token or a base URL must be provided.
 */
export type TelegramClientOptions = Omit<
  ResolvedTelegramClientOptions,
  "baseUrl"
> &
  TokenOrBaseUrl;

/**
 * Normalizes {@link TelegramClientOptions} to {@link ResolvedTelegramClientOptions}
 * so the client can be created.
 *
 * @internal
 */
export function normalizeOptions(
  options: TelegramClientOptions
): ResolvedTelegramClientOptions {
  const baseUrl = options.baseUrl
    ? String(options.baseUrl)
    : `https://api.telegram.org/bot${options.token}`;
  return {
    ...options,
    baseUrl,
  };
}

/**
 * Resolved options for the Telegram client.
 * This is the "client options" after normalizing them with {@link normalizeOptions}.
 *
 * @internal
 */
export interface ResolvedTelegramClientOptions {
  /** The base URL of the Telegram API. Contains the token. */
  readonly baseUrl: string;
  /** A custom fetch function. Defaults to the global `fetch`. */
  readonly fetch?: typeof fetch;
}

/**
 * Create a {@link Client}.
 *
 * @example
 * ```typescript
 * const client = createClient({ token: "xyz" });
 * const clientFromBaseUrl = createClient({ baseUrl: "https://api.telegram.org/botxyz" });
 * const clientWithCustomFetch = createClient({ token: "xyz", fetch: customFetchFunction });
 * ```
 *
 * @group Client
 */
export const createClient = (userOptions: TelegramClientOptions): Client => {
  const options = normalizeOptions(userOptions);
  return {
    request: (k, params) => request(options, k, params),
  };
};

/**
 * Build a FormData object based on the given a {@link Method}
 *
 * This allows you to have autocomplete and type-checking
 * when using the `client.request` function,
 * while still being able to upload files to the Telegram API.
 *
 * The rules work as follows:
 * - `string` parameters will be appended to the FormData using their name.
 * - `File` parameters will be appended with their name and filename (`new File(...).name`)
 * - Other parameters will be `JSON.stringify`ed and appended with their name.
 *
 * @example
 * ```typescript
 * const params = buildFormDataFor<"sendDocument">({
 *   chat_id: 123,
 *   document: new File(["hello"], "hello.txt")
 * });
 *
 * const response = await client.request("sendDocument", params);
 * ```
 *
 * @group Helpers
 */
export function buildFormDataFor<M extends keyof Methods>(
  params: FormDataParameters<M>
): FormData {
  const fd = new FormData();

  for (const [key, value] of Object.entries(params as object)) {
    if (value && value instanceof File) {
      fd.append(key, value, value.name);
    } else {
      fd.append(key, typeof value === "string" ? value : JSON.stringify(value));
    }
  }

  return fd;
}
