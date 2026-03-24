import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";

export const embeddings = new VoyageEmbeddings({
    apiKey: process.env.VOYAGEAI_API_KEY, // In Node.js defaults to process.env.VOYAGEAI_API_KEY
    inputType: "document", // Optional: specify input type as 'query', 'document', or omit for None / Undefined / Null
    truncation: true, // Optional: enable truncation of input texts
    outputDimension: 768, // Optional: set desired output embedding dimension
    outputDtype: "float", // Optional: set output data type ("float" or "int8")
    encodingFormat: "float", // Optional: set output encoding format ("float", "base64", or "ubinary")
    });

