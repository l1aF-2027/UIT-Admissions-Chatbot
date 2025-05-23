"use server"

import { revalidatePath } from "next/cache"
import { embedQuery } from "@/lib/embedding"
import { searchQdrant } from "@/lib/qdrant"
import { getMarkdownContent } from "@/lib/markdown"
import { generateGeminiResponse } from "@/lib/gemini"

export async function askQuestion(question: string) {
  const startTime = performance.now()

  try {
    // Embed the query
    const queryEmbedding = await embedQuery(question)

    // Search Qdrant for relevant documents
    const searchResults = await searchQdrant(question, queryEmbedding)

    // Get markdown content for top results
    const markdownContents = await getMarkdownContent(searchResults)

    const retrievalTime = performance.now() - startTime

    // Generate response using Gemini
    const answer = await generateGeminiResponse(question, markdownContents)

    const totalTime = performance.now() - startTime

    return {
      answer,
      retrievalTime,
      totalTime,
    }
  } catch (error) {
    console.error("Error in askQuestion:", error)
    throw new Error("Failed to process your question")
  } finally {
    revalidatePath("/")
  }
}
