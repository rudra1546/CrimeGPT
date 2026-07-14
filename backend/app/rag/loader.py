import pypdf
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_pdf_text(file_path: str) -> str:
    """
    Reads a PDF file and extracts all its text content.
    """
    reader = pypdf.PdfReader(file_path)
    text_content = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_content.append(page_text)
    return "\n".join(text_content)

def split_text_to_chunks(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[Document]:
    """
    Splits text content into smaller overlapping chunks (LangChain Document objects) 
    for optimal vector storage and retrieval.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=True
    )
    # returns list of Document objects
    return text_splitter.create_documents([text])
