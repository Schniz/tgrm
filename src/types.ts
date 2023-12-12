import type { ApiMethods } from "@grammyjs/types/methods";

export type Methods = ApiMethods<any>;
export type MethodParameters<K extends keyof Methods> = Parameters<
  Methods[K]
>[0];
export type MethodReturn<K extends keyof Methods> = ReturnType<Methods[K]>;
