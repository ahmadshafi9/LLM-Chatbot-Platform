import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 10 })
// const texts = splitter.createDocuments(["chapter6-part2(1).pdf"])