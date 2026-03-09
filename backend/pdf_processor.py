from pypdf import PdfReader

def extract_pages(file_path):

    reader = PdfReader(file_path)

    pages_text = []

    for page_number, page in enumerate(reader.pages):

        text = page.extract_text()

        if text and text.strip():
            pages_text.append({
                "page": page_number + 1,
                "text": text
            })

    return pages_text