import type { MethodParameters } from "./types";

type SendMessageParams = MethodParameters<"sendMessage">;
type MessageEntity = NonNullable<SendMessageParams["entities"]>[number];
export type PartialMessageEntity = {
  [key in MessageEntity["type"]]: Required<
    Omit<MessageEntity & { type: key }, "offset" | "length">
  >;
}[MessageEntity["type"]];

/**
 * A tagged template literal function that builds a message with entities.
 * This allows you to avoid using `parse_mode` when sending messages,
 * and instead use this helper to create the `entities` array
 * in a composable manner.
 *
 * @example
 * ```ts
 * buildMessage`Hello ${entity("world", { type: "bold" })}!`
 * // => "world" will be bold in the message
 * ```
 */
export const buildMessage = (
  strings: string[] | TemplateStringsArray,
  ...values: (string | DecoratedText)[]
): DecoratedText => {
  let text = "";
  let entities: MessageEntity[] = [];

  const append = (part: string) => {
    text = text + formatText(part);
  };

  const getLength = () => [...text].length;

  for (let i = 0; i < strings.length; i++) {
    const part = strings[i];
    const stringEntity = values[i];

    append(part);

    if (typeof stringEntity === "undefined") {
      continue;
    } else if (typeof stringEntity === "string") {
      append(stringEntity);
    } else if ("entities" in stringEntity) {
      const { text: entityText, entities: entitiesToEmbed = [] } = stringEntity;
      let offset = getLength();
      append(entityText);
      for (const entity of entitiesToEmbed) {
        entities.push({
          ...entity,
          offset: entity.offset + offset,
        });
      }
    }
  }

  return { text, entities };
};

const formatText = (text: string) => text.replace(/(?<!\r)\n/g, "\r\n");

interface DecoratedText extends Pick<SendMessageParams, "text" | "entities"> {}

/**
 * Wrap a text on an entire decorated message with an entity.
 * @see {@link buildMessage}
 */
export const entity = (
  contents: string | DecoratedText,
  entity: PartialMessageEntity
): DecoratedText => {
  const decorated: DecoratedText =
    typeof contents === "string" ? { entities: [], text: contents } : contents;

  const text = formatText(decorated.text);
  const length = [...text].length;
  const offset = 0;

  return {
    text,
    entities: [...(decorated.entities || []), { ...entity, offset, length }],
  };
};
