import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync, existsSync } from "fs";
import path from "path";

type MarkdownContent = {
  content: string;
  source_file: string;
  metadata: Record<string, any>;
};

// Function to extract local image paths from markdown content
function extractLocalImagePaths(markdownContent: string): string[] {
  // Match Markdown image syntax: ![alt text](local-path)
  const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;

  // Match HTML image tags: <img src="local-path" ... />
  const htmlImageRegex = /<img.*?src=["'](.*?)["'].*?>/g;

  const images: string[] = [];
  let match;

  // Extract markdown images (only local paths)
  while ((match = markdownImageRegex.exec(markdownContent)) !== null) {
    const imagePath = match[1];
    // Check if it's a local path (not starting with http)
    if (imagePath && !imagePath.startsWith("http")) {
      images.push(imagePath);
    }
  }

  // Extract HTML images (only local paths)
  while ((match = htmlImageRegex.exec(markdownContent)) !== null) {
    const imagePath = match[1];
    if (imagePath && !imagePath.startsWith("http")) {
      images.push(imagePath);
    }
  }

  return [...new Set(images)]; // Remove duplicates
}

// Function to load local image files
function loadLocalImage(
  imagePath: string,
  basePath: string = ""
): {
  data: Uint8Array;
  mimeType: string;
  path: string;
} | null {
  try {
    // Resolve the full path
    const fullPath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(basePath, imagePath);

    // Check if file exists
    if (!existsSync(fullPath)) {
      console.warn(`Image file not found: ${fullPath}`);
      return null;
    }

    // Read the file
    const imageData = readFileSync(fullPath);

    // Determine mime type based on file extension
    const extension = path.extname(imagePath).toLowerCase();
    let mimeType = "image/jpeg"; // Default

    switch (extension) {
      case ".png":
        mimeType = "image/png";
        break;
      case ".gif":
        mimeType = "image/gif";
        break;
      case ".webp":
        mimeType = "image/webp";
        break;
      case ".svg":
        mimeType = "image/svg+xml";
        break;
      case ".bmp":
        mimeType = "image/bmp";
        break;
      case ".ico":
        mimeType = "image/x-icon";
        break;
      case ".jpg":
      case ".jpeg":
      default:
        mimeType = "image/jpeg";
        break;
    }

    return {
      data: new Uint8Array(imageData),
      mimeType,
      path: fullPath,
    };
  } catch (error) {
    console.error(`Failed to load local image: ${imagePath}`, error);
    return null;
  }
}

// Function to validate image file
function isValidImageFile(filePath: string): boolean {
  const validExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".ico",
  ];
  const extension = path.extname(filePath).toLowerCase();
  return validExtensions.includes(extension);
}

export async function generateGeminiResponse(
  question: string,
  markdownContents: MarkdownContent[],
  basePath: string = ""
): Promise<string> {
  try {
    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20", // Use the latest multimodal model
    });

    // Prepare the content parts for the model
    const contentParts = [];
    const processedImages = new Set<string>(); // Track processed images to avoid duplicates

    // Add text context and process images for each document
    for (const doc of markdownContents) {
      // Normalize image paths in content (replace \ with /)
      const normalizedContent = doc.content.replace(/\\/g, "/");

      // Add document text content
      const metadataStr = Object.entries(doc.metadata)
        .filter(([_, value]) => value) // Filter out empty values
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      const textContent = `
---
Tài liệu: ${doc.source_file}
${metadataStr ? `Metadata: ${metadataStr}` : ""}
---

${normalizedContent}
`;

      contentParts.push({ text: textContent });

      // Extract and process local images from this document
      const localImagePaths = extractLocalImagePaths(normalizedContent);
      console.log(
        `Found ${localImagePaths.length} local images in ${doc.source_file}`
      );

      for (const imagePath of localImagePaths) {
        // Skip if already processed
        if (processedImages.has(imagePath)) {
          continue;
        }

        // Validate image file
        if (!isValidImageFile(imagePath)) {
          console.warn(`Skipping non-image file: ${imagePath}`);
          continue;
        }

        // Load the local image
        const imageFile = loadLocalImage(imagePath, basePath);
        if (imageFile) {
          // Add the image to content parts
          contentParts.push({
            inlineData: {
              data: Buffer.from(imageFile.data).toString("base64"),
              mimeType: imageFile.mimeType,
            },
          });

          // Add a text marker to indicate where this image came from
          contentParts.push({
            text: `\n[Hình ảnh từ tài liệu: ${doc.source_file}, đường dẫn local: ${imagePath}]\n`,
          });

          processedImages.add(imagePath);
          console.log(`✅ Loaded image: ${imagePath} (${imageFile.mimeType})`);
        }
      }
    }

    console.log(`Total content parts: ${contentParts.length}`);
    console.log(`Total images processed: ${processedImages.size}`);

    // Add the system prompt and user question
    contentParts.push({
      text: `
Bạn là trợ lý tư vấn tuyển sinh của Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM (UIT).

Nhiệm vụ của bạn:
1. Trả lời câu hỏi dựa trên thông tin từ các tài liệu được cung cấp (cả văn bản và hình ảnh)
2. Nếu có hình ảnh liên quan, hãy mô tả và giải thích nội dung hình ảnh
3. Nếu không tìm thấy thông tin trong tài liệu, hãy nói rằng bạn không có thông tin về vấn đề đó
4. Trả lời bằng tiếng Việt, ngắn gọn, súc tích và dễ hiểu
5. Sử dụng thông tin từ hình ảnh để bổ sung cho câu trả lời nếu cần thiết
6. Trả lời một cách tự nhiên đừng thể hiện ra mình là một con chat bot.
7. Nếu câu hỏi cần dựa vào ảnh hay tài liệu để trả lời thì hiện ảnh hoặc đường link ra.
8. Nếu hỏi về điểm chuẩn các năm ngoài 2024 và các phương thức khác thì dùng ảnh trong https://tuyensinh.uit.edu.vn/sites/default/files/uploads/images/202502/diem-chuan-2020-2024-sheet1.jpg để trả lời

Câu hỏi của người dùng: ${question}

Hãy trả lời dựa trên tài liệu và hình ảnh đã được cung cấp:
`,
    });

    // Generate response with multimodal content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: contentParts }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    const response = result.response.text();
    return response;
  } catch (error) {
    console.error("Error generating Gemini response:", error);

    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return "Lỗi: API key không hợp lệ. Vui lòng kiểm tra cấu hình.";
      } else if (error.message.includes("quota")) {
        return "Lỗi: Đã vượt quá giới hạn sử dụng API. Vui lòng thử lại sau.";
      } else if (error.message.includes("timeout")) {
        return "Lỗi: Timeout khi gọi API. Vui lòng thử lại.";
      }
    }

    return "Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.";
  }
}

// Utility function to get image statistics from markdown folder
export function getImageStats(markdownFolderPath: string): {
  totalImages: number;
  imageFiles: string[];
  invalidImages: string[];
} {
  const imageFiles: string[] = [];
  const invalidImages: string[] = [];

  try {
    const markdownFiles = require("fs")
      .readdirSync(markdownFolderPath)
      .filter((file: string) => file.endsWith(".md"));

    for (const file of markdownFiles) {
      const filePath = path.join(markdownFolderPath, file);
      const content = readFileSync(filePath, "utf-8");
      const imagePaths = extractLocalImagePaths(content);

      for (const imagePath of imagePaths) {
        const fullImagePath = path.join(markdownFolderPath, imagePath);
        if (existsSync(fullImagePath) && isValidImageFile(imagePath)) {
          imageFiles.push(imagePath);
        } else {
          invalidImages.push(imagePath);
        }
      }
    }
  } catch (error) {
    console.error("Error getting image stats:", error);
  }

  return {
    totalImages: imageFiles.length,
    imageFiles: [...new Set(imageFiles)], // Remove duplicates
    invalidImages: [...new Set(invalidImages)],
  };
}
