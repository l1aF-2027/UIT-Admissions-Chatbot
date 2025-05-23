import os
import json
from pathlib import Path
from typing import List, Dict
from transformers import AutoModel, AutoTokenizer
import torch
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, OptimizersConfigDiff
from tqdm import tqdm
import re
import uuid
from dotenv import load_dotenv

# Thiết lập thư mục hiện tại
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(CURRENT_DIR)

# Tải biến môi trường
load_dotenv()

# Cấu hình
CHUNKED_DATA_DIR = "chunked_json"  # Thư mục chứa dữ liệu đã phân đoạn
EMBEDDING_MODEL_NAME = "VoVanPhuc/sup-SimCSE-VietNamese-phobert-base"  # Mô hình đa ngôn ngữ hỗ trợ tiếng Việt
BATCH_SIZE = 8
MAX_LENGTH = 256
TITLE_WEIGHT = 10.0  # Tăng trọng số của tiêu đề
COLLECTION_NAME = "uit_documents_semantic"

# Khởi tạo Qdrant client
qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    timeout=60.0  # hoặc lớn hơn nếu cần, ví dụ 120.0
)

# Khởi tạo model và tokenizer
print(f"🔧 Đang tải mô hình embedding: {EMBEDDING_MODEL_NAME}")
tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"💻 Sử dụng thiết bị: {device}")
model.to(device)
model.eval()


def clean_text(text: str) -> str:
    """Làm sạch văn bản nhưng giữ lại cấu trúc metadata"""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_embeddings(texts: List[str]) -> np.ndarray:
    """Tạo embeddings cho danh sách văn bản"""
    try:
        # Đảm bảo văn bản không trống
        valid_texts = [text if text.strip() else "empty content" for text in texts]
        
        inputs = tokenizer(
            valid_texts,
            padding='max_length',
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt",
            return_attention_mask=True
        ).to(device)

        # Xử lý trường hợp ID token vượt quá kích thước vocabulary
        if torch.any(inputs["input_ids"] >= tokenizer.vocab_size):
            inputs["input_ids"] = torch.clamp(inputs["input_ids"], max=tokenizer.vocab_size - 1)

        with torch.no_grad():
            outputs = model(**inputs)

        # Sử dụng [CLS] token embedding (vector đại diện cho toàn bộ văn bản)
        embeddings = outputs.last_hidden_state[:, 0, :].cpu().numpy()
        return embeddings
    except Exception as e:
        print(f"❌ Lỗi khi tạo embeddings: {e}")
        # Trả về vector 0 với kích thước phù hợp nếu có lỗi
        return np.zeros((len(texts), model.config.hidden_size))


def combine_embeddings(title_embedding: np.ndarray, content_embedding: np.ndarray, title_weight: float = 1.0) -> np.ndarray:
    """
    Kết hợp embedding của tiêu đề và nội dung bằng cách cộng có trọng số.

    Args:
        title_embedding: Embedding của tiêu đề.
        content_embedding: Embedding của nội dung.
        title_weight: Trọng số của tiêu đề.

    Returns:
        Embedding kết hợp đã chuẩn hóa.
    """
    if content_embedding.ndim == 1:
        combined = (title_embedding * title_weight + content_embedding) / (title_weight + 1)
    else:
        combined = (title_embedding * title_weight + np.mean(content_embedding, axis=0)) / (title_weight + 1)
    
    # Chuẩn hóa vector để đảm bảo khoảng cách cosine hoạt động tốt
    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm
    
    return combined


def process_json_file(json_file_path: str) -> List[PointStruct]:
    """
    Xử lý một file JSON chứa các đoạn đã phân và tạo points cho Qdrant.
    Mỗi đoạn được tạo thành một point riêng nhưng vẫn giữ meta-data đầy đủ từ chunking.
    """
    try:
        with open(json_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not data:
            print(f"⚠️ File trống: {json_file_path}")
            return []

        points = []

        # Xử lý từng đoạn (chunk) thành một point riêng
        for chunk in data:
            title = chunk.get("title", "")
            content = chunk.get("content", "")

            if not content.strip():
                continue

            # Lấy metadata nếu có
            metadata = chunk.get("metadata", {})
            field = metadata.get("field", "")
            year = metadata.get("year", "")
            department = metadata.get("department", "chung")
            major = metadata.get("major", "")
            chunk_id = chunk.get("id", "") or metadata.get("chunk_id", "")
            source_file = chunk.get("source_file", "")
            section_title = metadata.get("section_title", "")
            original_title = metadata.get("original_title", "") or chunk.get("original_title", "")
            section_index = metadata.get("section_index", None)
            chunk_index = metadata.get("chunk_index", None)
            token_count = metadata.get("token_count", None)
            source_url = chunk.get("source_url", "")

            # Tạo embedding cho tiêu đề và nội dung
            clean_title = clean_text(title)
            clean_content = clean_text(content)

            title_embedding = get_embeddings([clean_title])[0]  # Vector của tiêu đề
            content_embedding = get_embeddings([clean_content])[0]  # Vector của nội dung

            # Kết hợp hai embedding với trọng số
            combined_embedding = combine_embeddings(title_embedding, content_embedding, TITLE_WEIGHT)

            # Tạo ID hợp lệ cho Qdrant
            point_id = str(uuid.uuid4())

            # Tạo point cho Qdrant, lưu đầy đủ metadata
            payload = {
                "title": title,
                "content": content,
                "source_file": str(source_file),
                "chunk_id": chunk_id,
                "field": field,
                "year": year,
                "department": department,
                "major": major,
                "original_title": original_title,
                "section_title": section_title,
                "section_index": section_index,
                "chunk_index": chunk_index,
                "token_count": token_count,
                "source_url": source_url
            }
            # Xóa các trường None để tránh lỗi Qdrant
            payload = {k: v for k, v in payload.items() if v is not None}

            point = PointStruct(
                id=point_id,
                vector=combined_embedding.tolist(),
                payload=payload
            )

            points.append(point)

        return points

    except Exception as e:
        print(f"❌ Lỗi khi xử lý file {json_file_path}: {e}")
        return []

def process_in_batches(all_points: List[PointStruct], batch_size: int = 50):
    """Xử lý và tải lên các points theo batch"""
    total_batches = (len(all_points) + batch_size - 1) // batch_size
    
    for i in tqdm(range(total_batches), desc="📤 Đang tải lên Qdrant"):
        start_idx = i * batch_size
        end_idx = min(start_idx + batch_size, len(all_points))
        batch_points = all_points[start_idx:end_idx]
        
        try:
            # Upload points với wait=True để đảm bảo indexing hoàn thành
            qdrant_client.upsert(
                collection_name=COLLECTION_NAME,
                points=batch_points,
                wait=True  # Đợi cho đến khi indexing hoàn thành
            )
        except Exception as e:
            print(f"❌ Lỗi khi tải lên batch {i+1}/{total_batches}: {e}")
            # Thử lại với batch size nhỏ hơn nếu có lỗi
            if len(batch_points) > 1:
                print(f"🔄 Thử lại với batch size nhỏ hơn...")
                for point in batch_points:
                    try:
                        qdrant_client.upsert(
                            collection_name=COLLECTION_NAME,
                            points=[point],
                            wait=True
                        )
                    except Exception as inner_e:
                        print(f"❌ Lỗi khi tải lên point đơn lẻ: {inner_e}")
        
        # In thông tin tiến độ indexing sau mỗi batch
        if (i + 1) % 10 == 0 or i == total_batches - 1:
            try:
                collection_info = qdrant_client.get_collection(COLLECTION_NAME)
                print(f"📊 Collection info - Points: {collection_info.points_count}, "
                      f"Indexed vectors: {collection_info.indexed_vectors_count}")
            except:
                pass


def create_collection(collection_name: str, vector_size: int = 768):
    """Tạo collection mới trong Qdrant"""
    try:
        # Kiểm tra xem collection đã tồn tại chưa
        collections = qdrant_client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if collection_name in collection_names:
            confirm = input(f"⚠️ Collection '{collection_name}' đã tồn tại. Bạn có muốn xóa và tạo lại không? (y/n): ")
            if confirm.lower() == 'y':
                qdrant_client.delete_collection(collection_name=collection_name)
            else:
                print(f"✅ Tiếp tục sử dụng collection: {collection_name}")
                # Cập nhật cấu hình optimizer cho collection hiện tại
                try:
                    qdrant_client.update_collection(
                        collection_name=collection_name,
                        optimizer_config=OptimizersConfigDiff(indexing_threshold=0)
                    )
                    print(f"✅ Đã cập nhật indexing_threshold=0 cho collection: {collection_name}")
                except Exception as opt_e:
                    print(f"⚠️ Không thể cập nhật optimizer config: {opt_e}")
                return
        
        print(f"🏗️ Đang tạo collection mới: {collection_name}")
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            ),
            # Thiết lập indexing_threshold=0 ngay khi tạo collection
            optimizer_config=OptimizersConfigDiff(indexing_threshold=0)
        )
        print(f"✅ Đã tạo collection với indexing_threshold=0: {collection_name}")
    
    except Exception as e:
        print(f"❌ Lỗi khi tạo collection: {e}")
        # Nếu lỗi với optimizer_config, thử tạo collection thông thường
        try:
            print(f"🔄 Thử tạo collection không có optimizer_config...")
            qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE
                )
            )
            # Sau đó cập nhật optimizer_config
            qdrant_client.update_collection(
                collection_name=collection_name,
                optimizer_config=OptimizersConfigDiff(indexing_threshold=0)
            )
            print(f"✅ Đã tạo collection và cập nhật indexing_threshold=0: {collection_name}")
        except Exception as e2:
            print(f"❌ Lỗi khi tạo collection (lần 2): {e2}")


def process_all_files(data_dir: str = CHUNKED_DATA_DIR, collection_name: str = COLLECTION_NAME):
    """Xử lý tất cả các file JSON trong thư mục và tải lên Qdrant"""
    # Tạo collection
    create_collection(collection_name)
    
    # Danh sách tất cả các files JSON
    json_files = list(Path(data_dir).glob("*.json"))
    
    if not json_files:
        print(f"⚠️ Không tìm thấy file JSON nào trong thư mục: {data_dir}")
        return
    
    print(f"🔍 Tìm thấy {len(json_files)} file JSON để xử lý")
    
    # Xử lý từng file và thu thập points
    all_points = []
    chunk_count = 0
    
    for json_file in tqdm(json_files, desc="📄 Đang xử lý các file"):
        points = process_json_file(json_file)
        all_points.extend(points)
        chunk_count += len(points)
        
        # Khi số lượng points đủ lớn, tải lên Qdrant và xóa bộ nhớ
        if len(all_points) >= 1000:
            process_in_batches(all_points)
            print(f"✅ Đã tải lên {len(all_points)} points")
            all_points = []
    
    # Tải lên các points còn lại
    if all_points:
        process_in_batches(all_points)
    
    print(f"🎉 Hoàn thành! Tổng cộng {chunk_count} đoạn đã được tải lên collection '{collection_name}'")


if __name__ == "__main__":
    print("🚀 Bắt đầu quá trình embedding và tải lên Qdrant")
    process_all_files()