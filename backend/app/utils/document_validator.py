import re
import json
import logging

logger = logging.getLogger("crimegpt.document_validation")

# Bracketed placeholder tags that must never appear in legal documents
BRACKETED_PLACEHOLDER_REGEX = re.compile(
    r"\[\s*(information required|missing.*|unspecified|not provided|to be filled|to be completed|none|n/?a)\s*\]",
    re.IGNORECASE
)

# Key-value lines where the value is a placeholder (e.g. "Address: N/A", "* Age: Unknown", "Item 2: Serial Number: Unknown")
KEY_VALUE_PLACEHOLDER_REGEX = re.compile(
    r"^.*:\s*(n/?a|unknown|not available|to be filled|unspecified|not provided|none|\[.*?\])\s*$",
    re.IGNORECASE
)

# Standalone line placeholder values
STANDALONE_PLACEHOLDER_REGEX = re.compile(
    r"^\s*(n/?a|unknown|not available|to be filled|information required|\[.*?\])\s*$",
    re.IGNORECASE
)

# Orphan labels (e.g., "Address:", "* ", "- ", "Age:", "Item 2: Serial Number:")
ORPHAN_LABEL_REGEX = re.compile(
    r"^\s*([\*\-]?\s*.*:)?\s*$",
    re.IGNORECASE
)

def strip_markdown_formatting(val: str) -> str:
    """
    Removes Markdown formatting symbols (**bold**, *italic*, __underline__, ### headers)
    and converts Markdown-styled labels into plain text.
    """
    if not val:
        return ""
    # Replace bold markdown markers **text** -> text
    s = re.sub(r"\*\*(.*?)\*\*", r"\1", val)
    # Replace italic/bold markdown markers *text* or __text__ -> text
    s = re.sub(r"\*(.*?)\*", r"\1", s)
    s = re.sub(r"__(.*?)__", r"\1", s)
    s = re.sub(r"_(.*?)_", r"\1", s)
    # Strip any residual standalone ** or __
    s = s.replace("**", "").replace("__", "")
    # Strip markdown header prefix ### or ## or #
    s = re.sub(r"^\s*#{1,6}\s*", "", s)
    # Clean up bullets like "* **Name:**" -> "Name:"
    s = re.sub(r"^\s*[\*\-]\s*([A-Za-z0-9_\s\/]+:)", r"\1", s)
    return s

def clean_and_validate_generated_document(content: str, document_type: str = "document") -> str:
    """
    Scans, cleans, and validates an AI-generated legal document content (JSON string or text).
    Removes placeholders, key-value lines with missing values, empty orphan labels, Markdown syntax markers, and logs cleanups.
    """
    if not content or not content.strip():
        return content

    cleaned = content.strip()
    if cleaned.startswith("```"):
        first_line_end = cleaned.find("\n")
        if first_line_end != -1:
            cleaned = cleaned[first_line_end:].strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        doc_data = json.loads(cleaned)
        if isinstance(doc_data, dict):
            cleaned_dict = _clean_document_dict(doc_data, document_type)
            return json.dumps(cleaned_dict, indent=2)
    except Exception:
        pass

    # Fallback plain text cleaning
    cleaned_text = _clean_text_content(cleaned, document_type)
    return cleaned_text

def _clean_document_dict(doc_data: dict, document_type: str) -> dict:
    # 0. Clean document_title
    if doc_data.get("document_title"):
        doc_data["document_title"] = strip_markdown_formatting(str(doc_data["document_title"]))

    # 1. Clean meta_info
    meta_info = doc_data.get("meta_info")
    if isinstance(meta_info, dict):
        new_meta = {}
        for k, v in meta_info.items():
            str_v = str(v).strip() if v is not None else ""
            if not str_v or BRACKETED_PLACEHOLDER_REGEX.search(str_v) or STANDALONE_PLACEHOLDER_REGEX.match(str_v):
                logger.info(
                    f"[Document Validation] [{document_type}] Removed placeholder key in meta_info | Key: '{k}' | Detected Value: '{v}'"
                )
            else:
                clean_k = strip_markdown_formatting(str(k))
                clean_v = strip_markdown_formatting(str_v)
                new_meta[clean_k] = clean_v
        doc_data["meta_info"] = new_meta

    # 2. Clean body_sections
    sections = doc_data.get("body_sections")
    if isinstance(sections, list):
        for sec in sections:
            if isinstance(sec, dict):
                heading = sec.get("heading", "")
                if heading:
                    clean_heading = strip_markdown_formatting(heading)
                    # Sanitize any legacy Panch heading terminology
                    clean_heading = clean_heading.replace("PANCHARAS / WITNESS DETAILS", "WITNESS DETAILS")
                    clean_heading = clean_heading.replace("PANCHAS (INDEPENDENT WITNESSES)", "WITNESS DETAILS")
                    clean_heading = clean_heading.replace("PANCH WITNESS DETAILS", "WITNESS DETAILS")
                    clean_heading = clean_heading.replace("Panch Witness", "Witness")
                    if clean_heading != heading:
                        logger.info(
                            f"[Document Validation] [{document_type}] Sanitized section heading from '{heading}' to '{clean_heading}'"
                        )
                    sec["heading"] = clean_heading

                text_key = "content" if "content" in sec else "text"
                raw_text = sec.get(text_key, "")
                if raw_text:
                    cleaned_text = _clean_text_content(raw_text, document_type)
                    sec[text_key] = cleaned_text

    # 3. Clean signatories
    signatories = doc_data.get("signatories")
    if isinstance(signatories, list):
        valid_sigs = []
        for sig in signatories:
            if isinstance(sig, dict):
                val = str(sig.get("value", "")).strip()
                label = str(sig.get("label", "")).strip()
                if BRACKETED_PLACEHOLDER_REGEX.search(val) or STANDALONE_PLACEHOLDER_REGEX.match(val):
                    logger.info(
                        f"[Document Validation] [{document_type}] Sanitized placeholder in signatory value | Label: '{label}' | Old Value: '{val}'"
                    )
                    sig["value"] = "Investigating Officer / Command Desk"
                else:
                    sig["value"] = strip_markdown_formatting(val)
                sig["label"] = strip_markdown_formatting(label)
                if sig.get("label") or sig.get("value"):
                    valid_sigs.append(sig)
        doc_data["signatories"] = valid_sigs

    return doc_data

def _clean_text_content(text: str, document_type: str) -> str:
    lines = text.split("\n")
    cleaned_lines = []

    for line in lines:
        stripped = line.strip()

        # Check for bracketed placeholders like [Information Required] or [MISSING ...]
        match_bracket = BRACKETED_PLACEHOLDER_REGEX.search(stripped)
        if match_bracket:
            logger.info(
                f"[Document Validation] [{document_type}] Omitted line with bracketed placeholder | Detected: '{match_bracket.group(0)}' | Line: '{stripped}'"
            )
            continue

        # Check for key-value placeholder lines like "Address: N/A", "* Age: Unknown", "Serial Number: Unknown"
        match_kv = KEY_VALUE_PLACEHOLDER_REGEX.match(stripped)
        if match_kv:
            logger.info(
                f"[Document Validation] [{document_type}] Omitted key-value line with missing value | Detected Value: '{match_kv.group(1)}' | Line: '{stripped}'"
            )
            continue

        # Check for standalone line placeholders
        match_standalone = STANDALONE_PLACEHOLDER_REGEX.match(stripped)
        if match_standalone:
            logger.info(
                f"[Document Validation] [{document_type}] Omitted standalone placeholder line | Line: '{stripped}'"
            )
            continue

        # Check for orphan labels like "Address:" or "* "
        if ":" in stripped and stripped.endswith(":") and len(stripped) < 40:
            logger.info(
                f"[Document Validation] [{document_type}] Omitted orphan label line | Line: '{stripped}'"
            )
            continue

        # Strip Markdown formatting syntax from line
        clean_line = strip_markdown_formatting(line)
        cleaned_lines.append(clean_line)

    # Rejoin lines while avoiding excessive blank lines
    result_lines = []
    prev_empty = False
    for line in cleaned_lines:
        is_empty = not line.strip()
        if is_empty:
            if not prev_empty and result_lines:
                result_lines.append("")
            prev_empty = True
        else:
            result_lines.append(line)
            prev_empty = False

    return "\n".join(result_lines).strip()
