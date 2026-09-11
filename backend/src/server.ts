import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Server Backend running on http://${env.NODE_ENV}_IP:${env.PORT}`);
});
