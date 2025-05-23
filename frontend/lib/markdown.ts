import fs from "fs/promises"
import path from "path"

type SearchResult = {
  id: string
  score: number
  title: string
  content: string
  source_file: string
  metadata: Record<string, any>
}

type MarkdownContent = {
  content: string
  source_file: string
  metadata: Record<string, any>
}

export async function getMarkdownContent(searchResults: SearchResult[]): Promise<MarkdownContent[]> {
  try {
    // Create a Set to track unique source files
    const uniqueSourceFiles = new Set<string>()
    const markdownContents: MarkdownContent[] = []

    // Get the markdown data directory from environment variables
    const dataDir = process.env.MARKDOWN_DATA_DIR || "markdown_data"

    for (const result of searchResults) {
      // Skip if we've already included this source file
      if (uniqueSourceFiles.has(result.source_file)) {
        continue
      }

      try {
        // Add to the set of unique source files
        uniqueSourceFiles.add(result.source_file)

        // Construct the file path
        const filePath = path.join(process.cwd(), dataDir, result.source_file)

        // Read the file content
        const content = await fs.readFile(filePath, "utf-8")

        // Add to markdown contents
        markdownContents.push({
          content,
          source_file: result.source_file,
          metadata: result.metadata,
        })
      } catch (fileError) {
        console.warn(`Could not read file ${result.source_file}:`, fileError)
        // Continue with other files even if one fails
      }
    }

    return markdownContents
  } catch (error) {
    console.error("Error getting markdown content:", error)
    throw new Error("Failed to retrieve document content")
  }
}
