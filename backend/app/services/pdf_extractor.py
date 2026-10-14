import pdfplumber

def extract_text_from_pdf(file_path: str) -> str:
    """
    PDF file එකක් ගන්නවා, ඒකේ තියෙන text ටික extract කරලා 
    එකම string එකක් විදිහට return කරනවා
    """
    full_text = ""
    
    with pdfplumber.open(file_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text()
            if page_text:
                full_text += f"\n--- Page {page_number} ---\n"
                full_text += page_text
    
    return full_text