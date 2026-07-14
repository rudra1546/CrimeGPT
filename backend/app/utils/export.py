import io
from docx import Document
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_bytes(content: str) -> io.BytesIO:
    """
    Converts plain text content into a formatted PDF document byte stream.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        leading=14,
        spaceAfter=6
    )
    
    story = []
    # Convert standard newline characters to HTML breaks for Platypus Paragraph compatibility
    formatted_content = content.replace("\n", "<br/>")
    story.append(Paragraph(formatted_content, body_style))
    doc.build(story)
    
    buffer.seek(0)
    return buffer

def generate_docx_bytes(content: str) -> io.BytesIO:
    """
    Converts plain text content into a formatted DOCX Word file byte stream.
    """
    doc = Document()
    
    # Add each line as a paragraph to ensure proper text separation
    for line in content.split("\n"):
        doc.add_paragraph(line)
        
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
