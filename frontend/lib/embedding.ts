// Sửa lại để gọi qua API route thay vì trực tiếp HF API
export async function embedQuery(query: string): Promise<number[]> {
  try {
    console.log(
      "🔍 [EMBED QUERY] Calling embedding API with query:",
      query.substring(0, 100) + "..."
    );

    // Gọi API route thay vì trực tiếp HF API
    const response = await fetch("/api/embedding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [EMBED QUERY] API error:", response.status, errorData);
      throw new Error(
        `Embedding API error: ${response.status} - ${
          errorData.error || "Unknown error"
        }`
      );
    }

    const data = await response.json();

    if (!data.embedding || !Array.isArray(data.embedding)) {
      console.error("❌ [EMBED QUERY] Invalid embedding response:", data);
      throw new Error("Invalid embedding response format");
    }

    console.log(
      "✅ [EMBED QUERY] Embedding received, length:",
      data.embedding.length
    );
    return data.embedding;
  } catch (error) {
    console.error("❌ [EMBED QUERY] Error:", error);

    // Fallback: return mock embedding for development
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 [EMBED QUERY] Using fallback mock embedding");
      return Array(768)
        .fill(0)
        .map(() => Math.random() - 0.5);
    }

    throw new Error("Failed to embed query");
  }
}
