import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";

export const queryEmbeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGEAI_API_KEY,
  modelName: "voyage-3-large",
  inputType: "query",
  truncation: true,
  outputDimension: 1024,
});
