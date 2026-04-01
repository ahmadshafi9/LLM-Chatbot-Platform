import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 150,
});
// const texts = splitter.createDocuments(["chapter6-part2(1).pdf"])