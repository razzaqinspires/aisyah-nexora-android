import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();
app.listen(config.port, "0.0.0.0", () => {
  // Do not print environment values or credentials.
  console.log(`Nexora API listening on port ${config.port}`);
});
