import { QdrantClient } from "@qdrant/js-client-rest";

// Initialize Qdrant client
let qdrantClient: QdrantClient | null = null;

function getQdrantClient() {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return qdrantClient;
}

type SearchResult = {
  id: string;
  score: number;
  title: string;
  content: string;
  source_file: string;
  metadata: Record<string, any>;
  field?: string;
  year?: string;
  department?: string;
  keywords?: string[];
};


export async function searchQdrant(
  query: string,
  queryEmbedding: number[],
  filterKeywords: string[] = [],
  limit = 5
): Promise<SearchResult[]> {
  try {
    const client = getQdrantClient();
    const collectionName =
      process.env.QDRANT_COLLECTION_NAME || "uit_documents_semantic";

    // 1. Vector search
    const searchResponse = await client.search(collectionName, {
      vector: queryEmbedding,
      limit: limit * 5, // lấy nhiều hơn để lọc lại
      with_payload: true,
    });

    // 2. Hybrid scoring: semantic + keyword match
    function keywordScore(docKeywords: string[] = [], filterKeywords: string[] = []) {
      if (!filterKeywords.length) return 0;
      const docSet = new Set(docKeywords.map(k => k.toLowerCase()));
      let matchCount = 0;
      for (const kw of filterKeywords) {
        if (docSet.has(kw.toLowerCase())) matchCount++;
      }
      return matchCount / filterKeywords.length; // tỉ lệ match
    }

    // 3. Kết hợp điểm semantic và keyword
    const semanticWeight = 0.7;
    const keywordWeight = 0.3;

    const results = searchResponse.map((hit) => {
      const docKeywords = (hit.payload?.keywords as string[]) || [];
      const kScore = keywordScore(docKeywords, filterKeywords);
      const combinedScore = semanticWeight * hit.score + keywordWeight * kScore;

      return {
        id: hit.id as string,
        score: combinedScore,
        title: (hit.payload?.title as string) || "",
        content: (hit.payload?.content as string) || "",
        source_file: (hit.payload?.source_file as string) || "",
        field: (hit.payload?.field as string) || "",
        year: (hit.payload?.year as string) || "",
        department: (hit.payload?.department as string) || "",
        keywords: docKeywords,
        metadata: hit.payload || {},
        semanticScore: hit.score,
        keywordScore: kScore,
      };
    });

    // 4. Sắp xếp lại theo combinedScore và trả về top N
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error("Error searching Qdrant:", error);
    throw new Error("Failed to search documents");
  }
}
