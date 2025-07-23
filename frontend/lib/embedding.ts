import { HfInference } from "@huggingface/inference";

// Server-side direct call function
async function embedQueryDirect(query: string): Promise<number[]> {
  const API_KEY =
    process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY;

  console.log("🔧 [EMBED DIRECT] API_KEY exists:", !!API_KEY);

  if (!API_KEY) {
    console.log("❌ [EMBED DIRECT] No API key found");
    // Return mock for development
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 [EMBED DIRECT] Using mock embedding");
      return Array(768)
        .fill(0)
        .map(() => Math.random() - 0.5);
    }
    throw new Error("No Hugging Face API key found");
  }

  try {
    const hf = new HfInference(API_KEY);
    const modelName =
      process.env.EMBEDDING_MODEL_NAME ||
      "VoVanPhuc/sup-SimCSE-VietNamese-phobert-base";

    console.log("🤖 [EMBED DIRECT] Calling HF API with model:", modelName);

    const response = await hf.featureExtraction({
      model: modelName,
      inputs: query,
    });

    console.log("✅ [EMBED DIRECT] HF API response received");

    if (Array.isArray(response)) {
      const embedding = Array.isArray(response[0]) ? response[0] : response;
      console.log("✅ [EMBED DIRECT] Embedding length:", embedding.length);
      return embedding as number[];
    }

    throw new Error("Unexpected embedding response format");
  } catch (error) {
    console.error("❌ [EMBED DIRECT] HF API Error:", error);
    throw error;
  }
}

// Client-side API call function
async function embedQueryAPI(query: string): Promise<number[]> {
  // Detect if we're on server or client
  const isServer = typeof window === "undefined";

  // For server-side, we need absolute URL or use direct call instead
  if (isServer) {
    console.log("🔧 [EMBED API] Server-side detected, using direct call");
    return embedQueryDirect(query);
  }

  console.log("🌐 [EMBED API] Client-side detected, using fetch");

  const response = await fetch("/api/embedding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: query }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Embedding API error: ${response.status} - ${
        errorData.error || "Unknown error"
      }`
    );
  }

  const data = await response.json();

  if (!data.embedding || !Array.isArray(data.embedding)) {
    throw new Error("Invalid embedding response format");
  }

  return data.embedding;
}

// Main export function
export async function embedQuery(query: string): Promise<number[]> {
  try {
    console.log(
      "🔍 [EMBED QUERY] Processing query:",
      query.substring(0, 50) + "..."
    );

    const isServer = typeof window === "undefined";
    console.log("🔍 [EMBED QUERY] Environment - isServer:", isServer);

    // Always use direct call for server-side to avoid fetch URL issues
    if (isServer) {
      return await embedQueryDirect(query);
    } else {
      return await embedQueryAPI(query);
    }
  } catch (error) {
    console.error("❌ [EMBED QUERY] Error:", error);

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 [EMBED QUERY] Using fallback mock embedding");
      return Array(768)
        .fill(0)
        .map(() => Math.random() - 0.5);
    }

    throw new Error("Failed to embed query");
  }
}
