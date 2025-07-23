import { type NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

// Debug: In ra khi file được load
console.log("🔍 [EMBEDDING ROUTE] File loaded at:", new Date().toISOString());

const API_KEY =
  process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY;

console.log("🔍 [EMBEDDING ROUTE] Environment check:");
console.log("  - API_KEY exists:", !!API_KEY);
console.log("  - API_KEY length:", API_KEY?.length || 0);
console.log("  - API_KEY starts with hf_:", API_KEY?.startsWith("hf_"));
console.log("  - NODE_ENV:", process.env.NODE_ENV);

// Chỉ khởi tạo HfInference khi có API key
let hf: HfInference | null = null;

if (API_KEY) {
  try {
    console.log("🔍 [EMBEDDING ROUTE] Initializing HfInference...");
    hf = new HfInference(API_KEY);
    console.log("✅ [EMBEDDING ROUTE] HfInference initialized successfully");
  } catch (error) {
    console.error(
      "❌ [EMBEDDING ROUTE] Error initializing HfInference:",
      error
    );
  }
} else {
  console.log(
    "⚠️ [EMBEDDING ROUTE] No API key found, HfInference not initialized"
  );
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`🚀 [EMBEDDING API] POST request received at ${timestamp}`);

  try {
    const { text } = await request.json();
    console.log(
      "📝 [EMBEDDING API] Input text:",
      text?.substring(0, 100) + "..."
    );

    if (!text || typeof text !== "string") {
      console.log("❌ [EMBEDDING API] Invalid text input");
      return NextResponse.json(
        { error: "Valid text is required" },
        { status: 400 }
      );
    }

    // Kiểm tra API key
    if (!API_KEY || !hf) {
      console.log("❌ [EMBEDDING API] No API key or HfInference instance");

      if (process.env.NODE_ENV === "development") {
        console.log("🔧 [EMBEDDING API] Using mock embedding for development");
        const mockEmbedding = Array(768)
          .fill(0)
          .map(() => Math.random() - 0.5);
        return NextResponse.json({ embedding: mockEmbedding });
      }

      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const modelName =
      process.env.EMBEDDING_MODEL_NAME ||
      "VoVanPhuc/sup-SimCSE-VietNamese-phobert-base";

    console.log("🤖 [EMBEDDING API] Calling Hugging Face API...");
    console.log("  - Model:", modelName);
    console.log("  - Text length:", text.length);

    // Gọi Hugging Face API
    const response = await hf.featureExtraction({
      model: modelName,
      inputs: text,
    });

    console.log("✅ [EMBEDDING API] HF API response received");
    console.log("  - Response type:", typeof response);
    console.log("  - Is array:", Array.isArray(response));

    // Xử lý response
    let embedding;
    if (Array.isArray(response)) {
      embedding = Array.isArray(response[0]) ? response[0] : response;
    } else {
      console.error("❌ [EMBEDDING API] Unexpected response format:", response);
      return NextResponse.json(
        { error: "Unexpected embedding response format" },
        { status: 500 }
      );
    }

    console.log(
      "✅ [EMBEDDING API] Embedding generated, length:",
      embedding.length
    );
    return NextResponse.json({ embedding });
  } catch (error) {
    console.error("❌ [EMBEDDING API] Error:", error);

    if (error instanceof Error) {
      console.error("  - Message:", error.message);
      console.error("  - Stack:", error.stack);
    }

    // Phân loại lỗi
    if (
      error.message?.includes("Invalid credentials") ||
      error.message?.includes("Authorization")
    ) {
      console.error("🔑 [EMBEDDING API] Authentication error");
      return NextResponse.json(
        { error: "Invalid Hugging Face API key" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate embedding" },
      { status: 500 }
    );
  }
}

// Debug: Export một GET method để test
export async function GET() {
  console.log("🔍 [EMBEDDING API] GET request for debugging");
  return NextResponse.json({
    status: "Embedding API is running",
    hasApiKey: !!API_KEY,
    hasHfInstance: !!hf,
    timestamp: new Date().toISOString(),
  });
}
