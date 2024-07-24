import { describe, expect, test } from "vitest";
import { entity, buildMessage } from "../src/build-message";

test("message with entity", () => {
  const msg = buildMessage`Hello ${entity("world", {
    type: "text_link",
    url: "https://example.com",
  })}`;
  expect(msg).toEqual({
    text: "Hello world",
    entities: [
      {
        type: "text_link",
        url: "https://example.com",
        offset: "Hello ".length,
        length: "world".length,
      },
    ],
  });
});

test("message with emoji", () => {
  const msg = buildMessage`Hello👋\n${entity("world🙏", {
    type: "text_link",
    url: "https://example.com",
  })}`;
  expect(msg).toEqual({
    text: "Hello👋\r\nworld🙏",
    entities: [
      {
        type: "text_link",
        url: "https://example.com",
        offset: "Hello ".length + 1 + "\r".length,
        length: "world".length + 1,
      },
    ],
  });
});

describe("carriage return", () => {
  test("message", () => {
    const msg = buildMessage`Hello\r\nworld\n!`;
    expect(msg.text).toEqual(`Hello\r\nworld\r\n!`);
  });

  test("entity", () => {
    const msg = entity("Hello\r\nworld\n!", { type: "bold" });
    expect(msg.text).toEqual(`Hello\r\nworld\r\n!`);
  });
});

test("composed entity", () => {
  const world = buildMessage`wor${entity("ld", { type: "italic" })}`;
  const msg = buildMessage`Hello ${entity(world, { type: "bold" })}`;
  expect(msg).toEqual({
    text: "Hello world",
    entities: [
      {
        type: "italic",
        length: "ld".length,
        offset: "Hello wor".length,
      },
      {
        type: "bold",
        length: "world".length,
        offset: "Hello ".length,
      },
    ],
  });
});
