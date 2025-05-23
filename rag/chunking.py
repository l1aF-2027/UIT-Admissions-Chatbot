import re
import os
import json
import hashlib
from pathlib import Path
from tqdm import tqdm
from datetime import datetime
import nltk
from nltk.tokenize import sent_tokenize
import unicodedata

# Tạo thư mục đầu ra
folder_dir = "chunked_json"
data_dir = "markdown_data"
os.makedirs(folder_dir, exist_ok=True)

# Cài đặt NLTK nếu cần
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# Các từ khóa quan trọng cho việc phân loại
TUYEN_SINH_KEYWORDS = [
    "tuyển sinh", "đợt", "phương thức", "đăng ký", "hồ sơ", "xét tuyển", 
    "nguyện vọng", "thời gian", "chỉ tiêu", "điều kiện", "quy định", 
    "thông báo", "hướng dẫn", "đại học", "học phí"
]

KET_QUA_KEYWORDS = [
    "kết quả", "điểm", "xét tuyển", "trúng tuyển", "điểm chuẩn", 
    "danh sách", "thí sinh", "đậu", "điểm cộng", "điểm ưu tiên"
]

NGANH_KEYWORDS = [
    "tổng quan", "ngành", "khoa", "chuyên ngành", "chương trình", 
    "đào tạo", "cơ hội việc làm", "bằng cấp", "giảng viên", "tín chỉ"
]

def normalize_text(text):
    """Chuẩn hóa văn bản tiếng Việt."""
    if not text:
        return ""
    # Loại bỏ dấu câu và chuyển về lowercase
    text = unicodedata.normalize('NFC', text)
    text = text.lower().strip()
    return text

def extract_year(text):
    """Trích xuất năm từ nội dung với nhiều mẫu khác nhau."""
    # Tìm năm với định dạng cụ thể như 2023-2024, năm 2023, etc.
    year_patterns = [
        r'(20\d{2})\s*-\s*(20\d{2})',  # 2023-2024
        r'năm\s+(20\d{2})',            # năm 2023
        r'khóa\s+(20\d{2})',           # khóa 2023
        r'k(20\d{2})',                 # k2023
        r'(20\d{2})[^\d]'              # 2023 (tổng quát)
    ]
    
    for pattern in year_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Trả về năm đầy đủ hoặc năm đầu tiên nếu có dải năm
            if len(match.groups()) > 1 and match.group(2):
                return f"{match.group(1)}-{match.group(2)}"
            return match.group(1)
    
    return None

def extract_department_and_major(text):
    """Trích xuất thông tin về khoa và ngành từ văn bản."""
    department_info = {
        "department": None,
        "major": None
    }
    
    # Mẫu tìm kiếm cho khoa/ngành
    patterns = [
        # Khoa/ngành cụ thể
        r'khoa\s+([^,.;:]+)',
        r'ngành\s+([^,.;:]+)',
        r'chuyên\s+ngành\s+([^,.;:]+)',
        # Tên ngành đặc biệt của UIT
        r'(công\s+nghệ\s+thông\s+tin)',
        r'(kỹ\s+thuật\s+phần\s+mềm)',
        r'(khoa\s+học\s+máy\s+tính)',
        r'(hệ\s+thống\s+thông\s+tin)',
        r'(kỹ\s+thuật\s+máy\s+tính)',
        r'(an\s+toàn\s+thông\s+tin)',
        r'(thương\s+mại\s+điện\s+tử)',
        r'(trí\s+tuệ\s+nhân\s+tạo)',
    ]
    
    normalized_text = normalize_text(text)
    
    for pattern in patterns:
        match = re.search(pattern, normalized_text, re.IGNORECASE)
        if match:
            extracted = match.group(1).strip()
            # Phân biệt khoa và ngành
            if "khoa" in pattern:
                department_info["department"] = extracted
            else:
                department_info["major"] = extracted
    
    return department_info

def detect_field(title, content):
    """Phát hiện lĩnh vực chính của văn bản."""
    lowered_text = normalize_text(title + " " + content[:500])  # Chỉ sử dụng 500 ký tự đầu tiên
    
    # Tính điểm cho mỗi lĩnh vực
    tuyen_sinh_score = sum(3 if keyword in lowered_text else 0 for keyword in TUYEN_SINH_KEYWORDS)
    ket_qua_score = sum(3 if keyword in lowered_text else 0 for keyword in KET_QUA_KEYWORDS)
    nganh_score = sum(3 if keyword in lowered_text else 0 for keyword in NGANH_KEYWORDS)
    
    # Tăng điểm nếu có từ khóa trong tiêu đề
    lowered_title = normalize_text(title)
    tuyen_sinh_score += sum(5 if keyword in lowered_title else 0 for keyword in TUYEN_SINH_KEYWORDS)
    ket_qua_score += sum(5 if keyword in lowered_title else 0 for keyword in KET_QUA_KEYWORDS)
    nganh_score += sum(5 if keyword in lowered_title else 0 for keyword in NGANH_KEYWORDS)
    
    # Xác định lĩnh vực dựa trên điểm
    scores = {
        "tuyen_sinh": tuyen_sinh_score,
        "ket_qua": ket_qua_score,
        "nganh": nganh_score
    }
    
    field = max(scores, key=scores.get)
    max_score = scores[field]
    
    # Nếu điểm quá thấp, coi là "khác"
    if max_score < 5:
        return "khac"
    
    return field

def chunk_content_by_semantics(content, max_tokens=300):
    """Chia nội dung thành các đoạn có tính ngữ nghĩa, đảm bảo không quá max_tokens."""
    # Chia văn bản thành các câu
    try:
        sentences = sent_tokenize(content)
    except:
        # Fallback nếu NLTK gặp lỗi
        sentences = re.split(r'[.!?]', content)
        sentences = [s.strip() + '.' for s in sentences if s.strip()]
    
    chunks = []
    current_chunk = []
    current_token_count = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        # Ước tính số token của câu
        tokens_in_sentence = len(sentence.split())
        
        # Nếu câu đơn lẻ quá dài, có thể chia nhỏ hơn
        if tokens_in_sentence > max_tokens:
            # Đảm bảo câu hiện tại được thêm vào kết quả
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_token_count = 0
            
            # Chia câu dài thành các đoạn nhỏ hơn
            words = sentence.split()
            temp_chunk = []
            for word in words:
                if len(temp_chunk) + 1 > max_tokens:
                    chunks.append(" ".join(temp_chunk))
                    temp_chunk = [word]
                else:
                    temp_chunk.append(word)
            
            if temp_chunk:
                chunks.append(" ".join(temp_chunk))
            continue
        
        # Kiểm tra nếu thêm câu mới vượt quá giới hạn token
        if current_token_count + tokens_in_sentence > max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_token_count = tokens_in_sentence
        else:
            current_chunk.append(sentence)
            current_token_count += tokens_in_sentence
    
    # Xử lý chunk cuối cùng
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

def extract_metadata(content, title):
    """Trích xuất metadata từ nội dung và tiêu đề."""
    metadata = {}
    
    # Trích xuất năm
    year = extract_year(content) or extract_year(title)
    if year:
        metadata["year"] = year
    
    # Trích xuất thông tin khoa/ngành
    dept_info = extract_department_and_major(content)
    if not dept_info["department"] and not dept_info["major"]:
        dept_info = extract_department_and_major(title)
    
    if dept_info["department"]:
        metadata["department"] = dept_info["department"]
    if dept_info["major"]:
        metadata["major"] = dept_info["major"]
    
    # Phát hiện lĩnh vực
    field = detect_field(title, content)
    metadata["field"] = field
    
    # Trích xuất các thông tin khác
    # Địa điểm/cơ sở
    location_match = re.search(r'tại\s+([^,.;:]+)', content, re.IGNORECASE)
    if location_match:
        metadata["location"] = location_match.group(1).strip()
    
    # Hạn chót/deadline
    deadline_match = re.search(r'hạn\s+([^,.;:]+)', content, re.IGNORECASE)
    if deadline_match:
        metadata["deadline"] = deadline_match.group(1).strip()
    
    return metadata

def generate_chunk_title(original_title, metadata, chunk_content, chunk_index):
    """Tạo tiêu đề mô tả cho chunk."""
    title_parts = []
    
    # Thêm lĩnh vực
    field_mapping = {
        "tuyen_sinh": "Tuyển sinh",
        "ket_qua": "Kết quả xét tuyển",
        "nganh": "Thông tin ngành",
        "khac": "Thông tin"
    }
    
    if "field" in metadata:
        title_parts.append(field_mapping.get(metadata["field"], "Thông tin"))
    
    # Thêm năm học
    if "year" in metadata:
        title_parts.append(metadata["year"])
    
    # Thêm ngành/khoa
    if "major" in metadata:
        title_parts.append(metadata["major"])
    elif "department" in metadata:
        title_parts.append(metadata["department"])
    
    # Thêm phần từ tiêu đề gốc nếu tiêu đề tạo ra quá ngắn
    if len(" ".join(title_parts)) < 20:
        short_original = original_title[:50].strip()
        if short_original not in " ".join(title_parts):
            title_parts.append(f"- {short_original}")
    
    # Thêm số chunk nếu có nhiều chunk
    if chunk_index > 0:
        title_parts.append(f"(Phần {chunk_index+1})")
    
    return " ".join(title_parts)

def create_chunk_id(source_file, content, chunk_index):
    """Tạo ID duy nhất cho mỗi chunk."""
    source_name = Path(source_file).stem
    content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()[:8]
    return f"{source_name}_{content_hash}_{chunk_index}"

def process_markdown_file(folder):
    """Xử lý tất cả các file markdown trong thư mục."""
    folder_path = Path(folder)
    output_path = Path(folder_dir)
    print(f"📁 Đang xử lý thư mục: {folder_path}")
    print(f"📂 Thư mục đầu ra: {output_path}")
    
    # Tạo thư mục đầu ra nếu chưa tồn tại
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Lấy danh sách tất cả các file markdown
    files = list(folder_path.glob("*.md"))
    all_chunks = []
    
    for file in tqdm(files, desc="📄 Đang xử lý các file"):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Tách tiêu đề và nội dung
            lines = content.splitlines()
            title_line = ""
            content_start = 0
            
            # Tìm dòng tiêu đề (bắt đầu bằng #)
            for i, line in enumerate(lines):
                if line.strip().startswith("#"):
                    title_line = line.replace("#", "").strip()
                    content_start = i + 1
                    break
            
            # Nếu không tìm thấy tiêu đề, lấy dòng đầu tiên
            if not title_line and lines:
                title_line = lines[0].strip()
                content_start = 1
            
            # Lấy nội dung chính
            main_content = "\n".join(lines[content_start:])
            
            # Trích xuất metadata
            metadata = extract_metadata(main_content, title_line)
            
            # Chia nội dung thành các phần dựa trên tiêu đề cấp 2
            sections = []
            current_section = {"header": "", "content": ""}
            
            for line in lines[content_start:]:
                if line.strip().startswith("##"):
                    # Lưu phần trước đó nếu có
                    if current_section["content"].strip():
                        sections.append(current_section)
                    
                    # Bắt đầu phần mới
                    current_section = {
                        "header": line.replace("#", "").strip(),
                        "content": ""
                    }
                else:
                    current_section["content"] += line + "\n"
            
            # Thêm phần cuối cùng
            if current_section["content"].strip():
                sections.append(current_section)
            
            # Nếu không có phần nào, tạo một phần mặc định
            if not sections:
                sections = [{"header": "", "content": main_content}]
            
            # Xử lý từng phần và tạo chunks
            file_chunks = []
            
            for i, section in enumerate(sections):
                section_content = section["content"].strip()
                if not section_content:
                    continue
                
                # Thêm header vào nội dung nếu có
                if section["header"]:
                    section_content = f"{section['header']}\n\n{section_content}"
                
                # Chia phần thành các chunks ngữ nghĩa
                content_chunks = chunk_content_by_semantics(section_content)
                
                for j, chunk_text in enumerate(content_chunks):
                    chunk_id = create_chunk_id(str(file), chunk_text, j)
                    chunk_title = generate_chunk_title(title_line, metadata, chunk_text, j if len(content_chunks) > 1 else -1)
                    
                    chunk_data = {
                        "id": chunk_id,
                        "title": chunk_title,
                        "content": chunk_text.strip(),
                        "source_file": str(file.name),
                        "source_url": "", # Sẽ được trích xuất từ nội dung nếu có
                        "metadata": metadata.copy()
                    }
                    
                    # Trích xuất URL nguồn nếu có
                    url_match = re.search(r'_Nguồn:\s*\[(.*?)\]\((.*?)\)_', chunk_text)
                    if url_match:
                        chunk_data["source_url"] = url_match.group(2)
                    
                    # Thêm metadata bổ sung
                    chunk_data["metadata"]["chunk_index"] = j
                    chunk_data["metadata"]["section_index"] = i
                    chunk_data["metadata"]["token_count"] = len(chunk_text.split())
                    chunk_data["metadata"]["original_title"] = title_line
                    if section["header"]:
                        chunk_data["metadata"]["section_title"] = section["header"]
                    
                    file_chunks.append(chunk_data)
                    all_chunks.append(chunk_data)
            
            # Lưu chunks của file vào JSON riêng
            json_filename = output_path / (file.stem + ".json")
            with open(json_filename, 'w', encoding='utf-8') as out_file:
                json.dump(file_chunks, out_file, ensure_ascii=False, indent=2)
                
        except Exception as e:
            print(f"❌ Lỗi khi xử lý file {file}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Lưu tất cả chunks vào một file tổng hợp
    all_chunks_file = output_path / "all_chunks.json"
    with open(all_chunks_file, 'w', encoding='utf-8') as out_file:
        json.dump(all_chunks, out_file, ensure_ascii=False, indent=2)
    
    # Tạo file thống kê
    stats = {
        "total_files": len(files),
        "total_chunks": len(all_chunks),
        "fields": {},
        "years": {},
        "departments": {},
        "majors": {},
        "processed_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Tính toán thống kê
    for chunk in all_chunks:
        field = chunk["metadata"].get("field", "unknown")
        year = chunk["metadata"].get("year", "unknown")
        department = chunk["metadata"].get("department", "unknown")
        major = chunk["metadata"].get("major", "unknown")
        
        stats["fields"][field] = stats["fields"].get(field, 0) + 1
        stats["years"][year] = stats["years"].get(year, 0) + 1
        stats["departments"][department] = stats["departments"].get(department, 0) + 1
        stats["majors"][major] = stats["majors"].get(major, 0) + 1
    
    # Lưu thống kê
    stats_file = output_path / "stats.json"
    with open(stats_file, 'w', encoding='utf-8') as out_file:
        json.dump(stats, out_file, ensure_ascii=False, indent=2)
    
    print(f"✅ Đã xử lý xong {len(files)} files thành {len(all_chunks)} chunks.")
    print(f"📊 Thống kê đã được lưu vào {stats_file}")

# Chạy xử lý
if __name__ == "__main__":
    process_markdown_file(data_dir)