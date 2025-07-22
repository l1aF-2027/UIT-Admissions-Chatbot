import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function embedQuery(query: string): Promise<number[]> {
  try {
    // For development/testing, return a mock embedding
    if (
      process.env.NODE_ENV === "development" &&
      !process.env.HUGGINGFACE_API_KEY
    ) {
      console.log("Using mock embedding for development");
      return Array(768)
        .fill(0)
        .map(() => Math.random() - 0.5);
    }

    // Use the same model as specified in the environment variables
    const modelName =
      process.env.EMBEDDING_MODEL_NAME ||
      "VoVanPhuc/sup-SimCSE-VietNamese-phobert-base";

    // Get embedding from Hugging Face
    const response = await hf.featureExtraction({
      model: modelName,
      inputs: query,
    });

    // If response is an array of arrays, take the first one
    if (Array.isArray(response)) {
      if (Array.isArray(response[0])) {
        return response[0] as number[];
      }
      return response as number[];
    }

    throw new Error("Unexpected embedding response format");
  } catch (error) {
    console.error("Error embedding query:", error);
    throw new Error("Failed to embed query");
  }
}
