from __future__ import annotations

import traceback
import logging
from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


from .polint_lcel import run_build, run_lint, run_normalize

import re
import to

from pypdf import PdfReader
from bs4 import BeautifulSoup
import httpx


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
