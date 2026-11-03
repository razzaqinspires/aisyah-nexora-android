export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  localLlmBaseUrl: process.env.LOCAL_LLM_BASE_URL ?? "http://127.0.0.1:11434/v1",
  localLlmModel: process.env.LOCAL_LLM_MODEL ?? "llama4:scout",
  localLlmApiKey: process.env.LOCAL_LLM_API_KEY ?? "",
  cloudLlmBaseUrl: process.env.CLOUD_LLM_BASE_URL ?? "",
  cloudLlmModel: process.env.CLOUD_LLM_MODEL ?? "",
  cloudLlmApiKey: process.env.CLOUD_LLM_API_KEY ?? "",
  chatMaxInputChars: Number(process.env.CHAT_MAX_INPUT_CHARS ?? 12000),
  chatTimeoutMs: Number(process.env.CHAT_TIMEOUT_MS ?? 45000),
};
