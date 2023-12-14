# tgrm

A minimal Telegram Bot API client

[Read the docs](https://tgrm.oss.hagever.com)

## Usage

```typescript
import { createClient, buildFormDataFor } from "tgrm";

const client = createClient({ token: "my-token" });

const message = await client.request("sendMessage", {
  chat_id: 123456789,
  text: "Hello, world!",
});

if (message.ok) {
  // Send a file!
  await client.request(
    "sendDocument",
    buildFormDataFor<"sendDocument">({
      chat_id: 123456789,
      reply_to_message_id: message.result.message_id,
      document: new File(["hello, world!"], "hello.txt"),
    })
  );
}
```
