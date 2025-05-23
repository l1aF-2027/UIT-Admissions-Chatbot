import { type NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // For development/testing, return a mock embedding
    if (
      process.env.NODE_ENV === "development" &&
      !process.env.HUGGINGFACE_API_KEY
    ) {
      const mockEmbedding = Array(768)
        .fill(0)
        .map(() => Math.random() - 0.5);
      return NextResponse.json({ embedding: mockEmbedding });
    }

    // Use the same model as specified in the environment variables
    const modelName =
      process.env.EMBEDDING_MODEL_NAME ||
      "VoVanPhuc/sup-SimCSE-VietNamese-phobert-base";

    // Get embedding from Hugging Face
    const response = await hf.featureExtraction({
      model: modelName,
      inputs: text,
    });

    // If response is an array of arrays, take the first one
    if (Array.isArray(response) && Array.isArray(response[0])) {
      return NextResponse.json({ embedding: response[0] });
    }

    // If response is a single array
    if (Array.isArray(response)) {
      return NextResponse.json({ embedding: response });
    }

    return NextResponse.json(
      { error: "Unexpected embedding response format" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in embedding API:", error);
    return NextResponse.json(
      { error: "Failed to generate embedding" },
      { status: 500 }
    );
  }
}
