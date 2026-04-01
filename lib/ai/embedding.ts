import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";

export const embeddings = new VoyageEmbeddings({
    apiKey: process.env.VOYAGEAI_API_KEY, // In Node.js defaults to process.env.VOYAGEAI_API_KEY
    modelName: "voyage-3-large",
    inputType: "document", // Optional: specify input type as 'query', 'document', or omit for None / Undefined / Null
    truncation: true, // Optional: enable truncation of input texts
    // voyage-3-large: request 1024-d then truncate to 768 for DB (see truncateEmbeddingForStore)
    outputDimension: 1024,
    // Do not set encodingFormat/outputDtype — current Voyage API rejects encoding_format "float"
    });

