import os
import re
import time
import hashlib
import requests
import markdownify
from tqdm import tqdm
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

crawl_folder = 'markdown_data'
images_folder = os.path.join(crawl_folder, 'images')
files_folder = os.path.join(crawl_folder, 'files')

# Tạo các thư mục cần thiết
os.makedirs(crawl_folder, exist_ok=True)
os.makedirs(images_folder, exist_ok=True)
os.makedirs(files_folder, exist_ok=True)

VALID_FILE_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.html', '.htm'
]

VALID_IMAGE_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'
]

EXCLUDE_SELECTORS = [
    "header", "footer", "nav", ".navigation", ".menu", ".sidebar",
    ".breadcrumb", ".site-branding", ".site-footer", "#content-lower",
    ".region-sidebar-first", ".region-sidebar-second", ".ads", ".advertisement",
    ".social-share", ".comments", ".related-posts"
]

def url_to_filename(url, base_url):
    """Tạo tên file markdown từ URL"""
    if url.rstrip('/') == base_url.rstrip('/'):
        return "trang-chu.md"
    
    parsed = urlparse(url)
    path = parsed.path.strip('/').replace('/', '_')
    
    if not path:
        path = hashlib.md5(url.encode()).hexdigest()
    
    # Loại bỏ các ký tự không hợp lệ
    path = re.sub(r'[<>:"/\\|?*]', '_', path)
    return path + ".md"

def download_image(img_url, images_folder):
    """Download ảnh về thư mục local và trả về đường dẫn local"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        print(f"📸 Downloading image: {img_url}")
        response = requests.get(img_url, headers=headers, stream=True, timeout=10)
        
        if response.status_code == 200:
            # Tạo tên file từ URL
            parsed_url = urlparse(img_url)
            original_filename = os.path.basename(parsed_url.path)
            
            if not original_filename or '.' not in original_filename:
                # Nếu không có tên file, tạo từ hash URL
                file_hash = hashlib.md5(img_url.encode()).hexdigest()[:8]
                
                # Detect content type
                content_type = response.headers.get('content-type', '').lower()
                if 'jpeg' in content_type or 'jpg' in content_type:
                    ext = '.jpg'
                elif 'png' in content_type:
                    ext = '.png'
                elif 'gif' in content_type:
                    ext = '.gif'
                elif 'webp' in content_type:
                    ext = '.webp'
                elif 'svg' in content_type:
                    ext = '.svg'
                else:
                    ext = '.jpg'  # default
                
                original_filename = f"image_{file_hash}{ext}"
            
            # Làm sạch tên file
            filename = re.sub(r'[<>:"/\\|?*]', '_', original_filename)
            filepath = os.path.join(images_folder, filename)
            
            # Tránh trùng tên file
            counter = 1
            base_name, ext = os.path.splitext(filename)
            while os.path.exists(filepath):
                filename = f"{base_name}_{counter}{ext}"
                filepath = os.path.join(images_folder, filename)
                counter += 1
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            print(f"✅ Image saved: {filename}")
            return os.path.join('images', filename)  # Trả về đường dẫn relative
        
        else:
            print(f"❌ Failed to download image: {img_url} (Status: {response.status_code})")
            return None
            
    except Exception as e:
        print(f"❗ Error downloading image {img_url}: {e}")
        return None

def download_file(url, files_folder):
    """Download file về thư mục local"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        print(f"📥 Downloading file: {url}")
        resp = requests.get(url, headers=headers, stream=True, timeout=30)
        
        if resp.status_code == 200:
            filename = os.path.basename(urlparse(url).path)
            
            if not filename:
                filename = hashlib.md5(url.encode()).hexdigest()
                ct = resp.headers.get('Content-Type', '').lower()
                if 'pdf' in ct: 
                    filename += '.pdf'
                elif 'word' in ct or 'document' in ct: 
                    filename += '.docx'
                elif 'excel' in ct or 'spreadsheet' in ct: 
                    filename += '.xlsx'
                elif 'powerpoint' in ct or 'presentation' in ct: 
                    filename += '.pptx'
                elif 'text/plain' in ct: 
                    filename += '.txt'
                elif 'text/html' in ct: 
                    filename += '.html'
                else: 
                    filename += '.bin'
            
            filepath = os.path.join(files_folder, filename)
            
            with open(filepath, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk: 
                        f.write(chunk)
            
            print(f"✅ File saved: {filename}")
            return True
        else:
            print(f"❌ Failed to download {url} - Status: {resp.status_code}")
    except Exception as e:
        print(f"❗ Error downloading {url}: {e}")
    
    return False

def should_download_file(url):
    """Kiểm tra URL có phải file cần tải không"""
    path = urlparse(url).path.lower()
    return any(path.endswith(ext) for ext in VALID_FILE_EXTENSIONS)

def is_image_url(url):
    """Kiểm tra URL có phải là ảnh không"""
    path = urlparse(url).path.lower()
    return any(path.endswith(ext) for ext in VALID_IMAGE_EXTENSIONS)

def clean_html_content(soup):
    """Làm sạch HTML content trước khi convert sang markdown"""
    # Xóa các thẻ script và style
    for script in soup(["script", "style"]):
        script.decompose()
    
    # Xóa các comment HTML
    from bs4 import Comment
    comments = soup.findAll(text=lambda text: isinstance(text, Comment))
    for comment in comments:
        comment.extract()
    
    # Xóa các thẻ không cần thiết
    for selector in EXCLUDE_SELECTORS:
        for tag in soup.select(selector):
            tag.decompose()
    
    # Xóa các thuộc tính không cần thiết từ các thẻ
    for tag in soup.find_all():
        # Giữ lại một số thuộc tính quan trọng
        keep_attrs = ['href', 'src', 'alt', 'title']
        if tag.name in ['a', 'img', 'iframe']:
            tag.attrs = {k: v for k, v in tag.attrs.items() if k in keep_attrs}
        else:
            tag.attrs = {}
    
    return soup

def process_images_in_content(soup, base_url, images_folder):
    """Xử lý tất cả ảnh trong content: download và cập nhật đường dẫn"""
    image_mapping = {}
    
    for img in soup.find_all('img', src=True):
        src = img['src'].strip()
        if not src:
            continue
        
        # Convert relative URL to absolute
        if not src.startswith(('http://', 'https://')):
            src = urljoin(base_url, src)
        
        # Download ảnh
        local_path = download_image(src, images_folder)
        if local_path:
            image_mapping[src] = local_path
            img['src'] = local_path  # Cập nhật src trong soup
    
    return soup, image_mapping

def extract_links_from_a_tags(soup, base_url):
    """Lấy các link từ thẻ <a>"""
    links = []
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        if href and href != '#' and not href.startswith('javascript:'):
            full_url = urljoin(base_url, href)
            links.append(full_url)
    return links

def crawl_and_save(url, folder, base_url):
    """Crawl trang web và lưu thành markdown với ảnh local"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    # Kiểm tra nếu là file cần download
    if should_download_file(url):
        download_file(url, files_folder)
        return []
    
    try:
        print(f"🌐 Crawling: {url}")
        resp = requests.get(url, headers=headers, timeout=30)
        
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.content, 'html.parser')
            
            # Extract links trước khi làm sạch content
            a_links = extract_links_from_a_tags(soup, url)
            
            # Tìm main content
            content_selectors = [
                'div.field-item', 'div.field__item', 'div.main-content',
                'div.content-body', 'article .content', 'div.node-content',
                'div.body-content', 'div.entry-content', 'div.post-content',
                '.field-name-body', 'main', 'article'
            ]
            
            main_content = None
            for selector in content_selectors:
                elements = soup.select(selector)
                if elements:
                    main_content = elements[0]
                    print(f"✓ Found content using selector: {selector}")
                    break
            
            if not main_content:
                main_content = soup.find('div', {'id': 'content'}) or soup.find('body')
                print("⚠️ Using fallback content selector")
            
            if main_content:
                # Làm sạch HTML
                main_content = clean_html_content(main_content)
                
                # Process images - download và update paths
                main_content, image_mapping = process_images_in_content(
                    main_content, url, images_folder
                )
                
                # Xử lý iframe
                iframe_info = []
                for idx, iframe in enumerate(main_content.find_all('iframe', src=True)):
                    src = iframe.get('src', '')
                    if src:
                        abs_src = urljoin(url, src)
                        iframe_info.append(f"**Iframe {idx+1}**: [{abs_src}]({abs_src})")
                
                # Convert HTML to Markdown với cấu hình tốt hơn
                markdown_content = markdownify.markdownify(
                    str(main_content),
                    heading_style="ATX",
                    wrap=0,
                    strip=['script', 'style', 'noscript', 'meta', 'link']
                )
                
                # Làm sạch markdown
                # Loại bỏ các dòng trống thừa
                markdown_content = re.sub(r'\n\s*\n\s*\n', '\n\n', markdown_content)
                # Loại bỏ các khoảng trắng thừa
                markdown_content = re.sub(r'[ \t]+', ' ', markdown_content)
                
                # Lấy title
                title = "Không có tiêu đề"
                if soup.title and soup.title.string:
                    title = soup.title.string.strip()
                elif soup.find('h1'):
                    title = soup.find('h1').get_text().strip()
                
                # Tạo nội dung markdown cuối cùng
                final_markdown = f"# {title}\n\n_Nguồn: [{url}]({url})_\n\n{markdown_content}"
                
                # Thêm thông tin iframe nếu có
                if iframe_info:
                    final_markdown += "\n\n## Embedded Content (iframes)\n\n" + "\n\n".join(iframe_info)
                
                # Thêm thông tin về images đã download
                if image_mapping:
                    final_markdown += f"\n\n## Images Downloaded\n\n"
                    for original_url, local_path in image_mapping.items():
                        final_markdown += f"- `{local_path}` (từ {original_url})\n"
                
                # Lưu file markdown
                filename = url_to_filename(url, base_url)
                filepath = os.path.join(folder, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(final_markdown)
                
                print(f"✅ Saved: {url} -> {filepath}")
                print(f"📷 Downloaded {len(image_mapping)} images")
                
                return a_links
            else:
                print(f"❌ No content found at: {url}")
                
        else:
            print(f"❌ Failed to get {url} - Status: {resp.status_code}")
            
    except Exception as e:
        print(f"❗ Error crawling {url}: {e}")
        import traceback
        traceback.print_exc()
    
    return []

if __name__ == "__main__":
    base_url = 'https://tuyensinh.uit.edu.vn/'
    visited = set()
    
    # Crawl trang chủ trước
    links = crawl_and_save(base_url, crawl_folder, base_url)
    visited.add(base_url.rstrip('/'))
    
    if links:
        # Lọc links cùng domain
        filtered_links = []
        for link in links:
            try:
                if not link or not isinstance(link, str):
                    continue
                    
                link = link.split('#')[0].strip()  # Loại bỏ anchor
                if not link:
                    continue
                
                parsed = urlparse(link)
                is_same_domain = 'tuyensinh.uit.edu.vn' in parsed.netloc
                
                if is_same_domain and link.rstrip('/') not in visited:
                    filtered_links.append(link)
                    
            except Exception as e:
                print(f"⚠️ Skipping malformed link: {e}")
        
        print(f"🔄 Found {len(filtered_links)} links to crawl")
        
        # Crawl từng link
        for link in tqdm(filtered_links, desc="🔄 Crawling links"):
            if link.rstrip('/') not in visited:
                crawl_and_save(link, crawl_folder, base_url)
                visited.add(link.rstrip('/'))
                time.sleep(1)  # Delay để tránh spam server
    
    print(f"\n🎉 Crawling completed!")
    print(f"📁 Markdown files: {crawl_folder}")
    print(f"🖼️ Images: {images_folder}")
    print(f"📎 Files: {files_folder}")