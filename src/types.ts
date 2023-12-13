import type { ApiMethods } from "@grammyjs/types/methods";

const TgrmFileId = Symbol("tgrm/file");

/**
 * A symbol that marks a File type
 */
export type TgrmFileId = typeof TgrmFileId;

/**
 * All the methods of the Telegram Bot API
 */
export type Methods = ApiMethods<TgrmFileId>;

/**
 * The parameters of a given method from {@link Methods}
 */
export type MethodParameters<K extends keyof Methods> = Parameters<
  Methods[K]
>[0];

/**
 * The return type of a given method from {@link Methods}
 */
export type MethodReturn<K extends keyof Methods> = ReturnType<Methods[K]>;

/**
 * The parameters of a given method from {@link Methods} with the File type replaced by a Blob
 *
 * @example <caption>Replace the file_id parameter with a File</caption>
 * ```ts
 * const file = new File(["hello"], "hello.txt");
 * const params: FormDataParameters<"sendDocument"> = { chat_id: 123, document: file };
 * ```
 */
export type FormDataParameters<K extends keyof Methods> = {
  [key in keyof MethodParameters<K>]: TgrmFileId extends MethodParameters<K>[key]
    ? Exclude<MethodParameters<K>[key], TgrmFileId> | File
    : MethodParameters<K>[key];
};
