import { type NextRequest, NextResponse } from "next/server"
import { embedQuery } from "@/lib/embedding"
import { searchQdrant } from "@/lib/qdrant"
import { getMarkdownContent } from "@/lib/markdown"
import { generateGeminiResponse } from "@/lib/gemini"

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    const { question } = await request.json()

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

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

    return NextResponse.json({
      answer,
      retrievalTime,
      totalTime,
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Failed to process your question" }, { status: 500 })
  }
}
