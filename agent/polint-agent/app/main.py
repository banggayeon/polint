from __future__ import annotations

import traceback
import logging
from fastapi import FastAPI, HTTPException
from fastapi import File, UploadFile
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


from .polint_lcel import run_build, run_lint, run_normalize

import re
import io

from pypdf import PdfReader
from bs4 import BeautifulSoup
import httpx

try:
    from docx import Document as DocxDocument
except Exception:
    DocxDocument = None

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocIn(BaseModel):
    id: str
    content: str

class BuildIn(BaseModel):
    policyId: str
    regulationText: str
    knowledgeDocs: List[DocIn] = Field(default_factory=list)

class LintIn(BaseModel):
    ruleset: Dict[str, Any]
    docs: List[DocIn]

class ExtractUrlIn(BaseModel):
    url: str


class ExtractOut(BaseModel):
    title: Optional[str] = None
    text: str
    mime_type: Optional[str] = None
    source: str

app = FastAPI(title="Polint Agent Service (LCEL)", version="0.2.0")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/v1/agent/build")
def build(req: BuildIn):
    try:
        logger.info(f"Build request received: policyId={req.policyId}, regulationText length={len(req.regulationText)}, knowledgeDocs count={len(req.knowledgeDocs)}")
        result = run_build(
            policy_id=req.policyId,
            regulation_text=req.regulationText,
            knowledge_docs=[d.model_dump() for d in req.knowledgeDocs],
        )
        logger.info("Build completed successfully")
        return result
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Build error: {str(e)}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"{str(e)}\n\nTraceback:\n{error_trace}")

@app.post("/v1/agent/normalize")
def normalize(req: BuildIn):
    try:
        logger.info(f"Normalize request received: policyId={req.policyId}, regulationText length={len(req.regulationText)}, knowledgeDocs count={len(req.knowledgeDocs)}")
        result = run_normalize(
            policy_id=req.policyId,
            regulation_text=req.regulationText,
            knowledge_docs=[d.model_dump() for d in req.knowledgeDocs],
        )
        logger.info("Normalize completed successfully")
        return result
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Normalize error: {str(e)}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"{str(e)}\n\nTraceback:\n{error_trace}")

@app.post("/v1/agent/lint")
def lint(req: LintIn):
    try:
        logger.info(f"Lint request received: ruleset keys={list(req.ruleset.keys())}, docs count={len(req.docs)}")
        result = run_lint(
            ruleset_dict=req.ruleset,
            docs=[d.model_dump() for d in req.docs],
        )
        logger.info("Lint completed successfully")
        return result
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Lint error: {str(e)}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"{str(e)}\n\nTraceback:\n{error_trace}")

def _clean_text(s: str) -> str:
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    # 과도한 공백/빈 줄 정리
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s.strip()


def _decode_text_bytes(b: bytes) -> str:
    for enc in ("utf-8", "cp949", "euc-kr", "latin1"):
        try:
            return b.decode(enc)
        except Exception:
            continue
    return b.decode("utf-8", errors="ignore")


def extract_pdf_text(b: bytes) -> str:
    reader = PdfReader(io.BytesIO(b))
    parts = []
    for page in reader.pages:
        t = page.extract_text() or ""
        if t.strip():
            parts.append(t)
    return _clean_text("\n\n".join(parts))


def extract_docx_text(b: bytes) -> str:
    if DocxDocument is None:
        raise RuntimeError("python-docx is not installed in agent container.")
    doc = DocxDocument(io.BytesIO(b))
    parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    return _clean_text("\n".join(parts))


def extract_html_text(html: str) -> tuple[Optional[str], str]:
    soup = BeautifulSoup(html, "lxml")
    title = soup.title.string.strip() if soup.title and soup.title.string else None

    # script/style 제거
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text("\n")
    return title, _clean_text(text)


@app.post("/v1/agent/extract/file", response_model=ExtractOut)
async def extract_file(file: UploadFile = File(...)):
    b = await file.read()
    filename = (file.filename or "").lower()
    mime = file.content_type

    try:
        if filename.endswith(".pdf") or mime == "application/pdf":
            text = extract_pdf_text(b)
            return ExtractOut(title=file.filename, text=text, mime_type=mime, source="file")

        if filename.endswith(".docx") or mime in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",):
            text = extract_docx_text(b)
            return ExtractOut(title=file.filename, text=text, mime_type=mime, source="file")

        if filename.endswith(".txt") or filename.endswith(".md") or (mime and mime.startswith("text/")):
            text = _clean_text(_decode_text_bytes(b))
            return ExtractOut(title=file.filename, text=text, mime_type=mime, source="file")

        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename} ({mime})")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"extract failed: {e}")


@app.post("/v1/agent/extract/url", response_model=ExtractOut)
async def extract_url(req: ExtractUrlIn):
    url = (req.url or "").strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Only http/https URLs are supported.")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
            r = await client.get(url, headers={"User-Agent": "polint-agent/0.2"})
            r.raise_for_status()

        title, text = extract_html_text(r.text)
        return ExtractOut(title=title or url, text=text, mime_type=r.headers.get("content-type"), source="url")

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"fetch failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"extract failed: {e}")