"""
Polint MVP Draft (LCEL style)
- (a) rule types expanded to 8
- (b) loaders: folder/pdf/url -> documents

주의:
- 실제 모델명은 SDK/계정에 따라 다를 수 있어요.
- 구조/패턴(LCEL, retriever|format_docs, RunnablePassthrough)은 실습 스타일 유지.
"""

from __future__ import annotations

import difflib
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from operator import itemgetter
from pydantic import BaseModel, Field

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from langchain_core.runnables import RunnableLambda, RunnablePassthrough

from langchain_text_splitters import RecursiveCharacterTextSplitter

# Chroma import (newer LangChain uses langchain-chroma)
try:
    from langchain_chroma import Chroma  # type: ignore
except Exception:
    from langchain_community.vectorstores import Chroma  # type: ignore

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI

# loaders
from langchain_community.document_loaders import TextLoader, PyPDFLoader, WebBaseLoader


# =========================================================
# 1) 스키마
# =========================================================

Modality = Literal["MUST", "MUST_NOT", "SHOULD", "MAY"]


class Clause(BaseModel):
    clause_id: str
    modality: Modality
    subject: str
    action: str
    obj: str
    condition: Optional[str] = None
    exception: Optional[str] = None
    ambiguity_notes: Optional[str] = None


class NormalizedPolicy(BaseModel):
    policy_id: str
    clauses: List[Clause]
    open_questions: List[str] = Field(default_factory=list)


RuleType = Literal[
    "FORBIDDEN_PHRASE",
    "REQUIRED_PHRASE",
    "REGEX_MUST_MATCH",
    "REGEX_MUST_NOT_MATCH",
    "REQUIRED_SECTION_HEADING",
    "REQUIRED_KV_FIELD",
    "KV_FIELD_REGEX",
    "KV_FIELD_ALLOWED_VALUES",
]


class Rule(BaseModel):
    rule_id: str
    clause_id: str
    severity: Literal["error", "warn"]
    rule_type: RuleType

    # 공통 패턴(phrase 또는 regex)
    pattern: Optional[str] = None

    # KV/섹션 계열에서 쓰는 target
    target_key: Optional[str] = None  # 예: "제출자 이름"
    allowed_values: Optional[List[str]] = None  # 예: ["Y", "N"]

    message: str
    fix_hint: Optional[str] = None


class RuleSet(BaseModel):
    policy_id: str
    rules: List[Rule]


class TestCase(BaseModel):
    test_id: str
    doc_text: str
    expected_violations: List[str] = Field(default_factory=list)


class TestSuite(BaseModel):
    tests: List[TestCase]


class Violation(BaseModel):
    rule_id: str
    clause_id: str
    severity: Literal["error", "warn"]
    evidence: str
    message: str


class VerificationReport(BaseModel):
    summary: str
    mismatches: List[str] = Field(default_factory=list)
    suggested_rule_tweaks: List[str] = Field(default_factory=list)


class AuditEntry(BaseModel):
    doc_id: str
    rule_id: str
    clause_id: str
    severity: str
    decision: Literal["warn", "fix_suggested", "pass"]
    rationale: str


class AuditLog(BaseModel):
    entries: List[AuditEntry]


# =========================================================
# 2) 모델 설정 (요청한 역할별 모델)
# =========================================================

@dataclass
class ModelNames:
    # NOTE: 모델명은 계정/SDK에 따라 다를 수 있어 env로 override 가능하게 둠
    normalizer: str = os.getenv("MODEL_NORMALIZER", "gpt-4o-mini")
    compiler: str = os.getenv("MODEL_COMPILER", "claude-sonnet-4-5-20250929")
    fixer: str = os.getenv("MODEL_FIXER", "claude-haiku-4-5-20251001")
    verifier: str = os.getenv("MODEL_VERIFIER", "gemini-2.0-flash")
    auditor: str = os.getenv("MODEL_AUDITOR", "gemini-2.0-flash-lite")


MODEL = ModelNames()


def llm_normalizer():
    import logging
    logger = logging.getLogger(__name__)
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set. Required for normalizer.")
    
    logger.info(f"Initializing normalizer with model: {MODEL.normalizer}")
    return ChatOpenAI(model=MODEL.normalizer, temperature=0)


def llm_compiler():
    import logging
    logger = logging.getLogger(__name__)
    
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set. Required for compiler.")
    
    logger.info(f"Initializing compiler with model: {MODEL.compiler}")
    # ChatAnthropic는 버전에 따라 model/model_name이 다를 수 있어 둘 다 지원
    try:
        return ChatAnthropic(model=MODEL.compiler, temperature=0)
    except TypeError:
        return ChatAnthropic(model_name=MODEL.compiler, temperature=0)


def llm_fixer():
    import logging
    logger = logging.getLogger(__name__)
    
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set. Required for fixer.")
    
    logger.info(f"Initializing fixer with model: {MODEL.fixer}")
    try:
        return ChatAnthropic(model=MODEL.fixer, temperature=0)
    except TypeError:
        return ChatAnthropic(model_name=MODEL.fixer, temperature=0)


def llm_verifier():
    import logging
    logger = logging.getLogger(__name__)
    
    # langchain_google_genai는 GOOGLE_API_KEY를 기대하지만,
    # GEMINI_API_KEY만 둔 환경도 많아서 둘 다 지원
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable is not set. Required for verifier.")
    
    logger.info(f"Initializing verifier with model: {MODEL.verifier}")
    return ChatGoogleGenerativeAI(model=MODEL.verifier, temperature=0, google_api_key=api_key)


def llm_auditor():
    import logging
    logger = logging.getLogger(__name__)
    
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable is not set. Required for auditor.")
    
    logger.info(f"Initializing auditor with model: {MODEL.auditor}")
    return ChatGoogleGenerativeAI(model=MODEL.auditor, temperature=0, google_api_key=api_key)


# =========================================================
# 3) 로더 (b)
# =========================================================

def load_text_file(path: Path) -> List[Document]:
    return TextLoader(str(path), encoding="utf-8").load()


def load_pdf_file(path: Path) -> List[Document]:
    return PyPDFLoader(str(path)).load()


def load_url(url: str) -> List[Document]:
    return WebBaseLoader(url).load()


def load_docs_from_path(path: str) -> List[Document]:
    p = Path(path)
    if p.is_dir():
        docs: List[Document] = []
        for fp in sorted(p.rglob("*")):
            if fp.suffix.lower() in [".txt", ".md"]:
                docs.extend(load_text_file(fp))
            elif fp.suffix.lower() == ".pdf":
                docs.extend(load_pdf_file(fp))
        return docs

    # file
    if p.suffix.lower() in [".txt", ".md"]:
        return load_text_file(p)
    if p.suffix.lower() == ".pdf":
        return load_pdf_file(p)

    raise ValueError(f"Unsupported path: {path}")


def docs_to_plain_text(docs: List[Document]) -> str:
    # PDF는 페이지 단위로 여러 Document가 나오므로 합침
    return "\n\n".join(d.page_content for d in docs).strip()


# =========================================================
# 4) RAG 인덱싱
# =========================================================

def build_vectorstore(all_docs: List[Document]) -> Chroma:
    import logging
    logger = logging.getLogger(__name__)
    
    # API 키 확인
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set. Required for embeddings.")
    
    splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
    splits = splitter.split_documents(all_docs)
    logger.info(f"Split documents into {len(splits)} chunks")

    embed_model = os.getenv("EMBED_MODEL", "text-embedding-3-small")
    logger.info(f"Using embedding model: {embed_model}")
    embeddings = OpenAIEmbeddings(model=embed_model)
    
    # request마다 컬렉션을 분리(메모리) — 충돌 방지
    collection_name = "polint_kb_" + os.urandom(4).hex()
    logger.info(f"Creating Chroma collection: {collection_name} (in-memory)")
    
    # 메모리 기반 Chroma 사용 (persist_directory를 지정하지 않으면 메모리 모드)
    try:
        return Chroma.from_documents(
            splits, 
            embeddings, 
            collection_name=collection_name
        )
    except Exception as e:
        logger.error(f"Failed to create Chroma vectorstore: {str(e)}")
        raise ValueError(f"Failed to create vectorstore: {str(e)}") from e


def format_docs(docs: List[Document]) -> str:
    return "\n\n---\n\n".join(d.page_content for d in docs)


# =========================================================
# 5) 에이전트 체인
# =========================================================

def make_normalizer_chain(retriever):
    llm = llm_normalizer()
    parser = PydanticOutputParser(pydantic_object=NormalizedPolicy)

    prompt = ChatPromptTemplate.from_template(
        """당신은 규정(Policy)을 기계 검증 가능한 형태로 정규화하는 에이전트다.

[요구사항]
1) 조항을 clause 단위로 나누고 modality를 MUST/MUST_NOT/SHOULD/MAY로 분류
2) subject/action/obj/condition/exception을 채워라
3) 애매한 표현(가능하면/필요 시/권장)은 ambiguity_notes로 남기고,
   Human-in-the-loop 질문은 open_questions에 추가하라
4) 출력은 반드시 아래 포맷을 따른다.

{format_instructions}

[context]
{context}

[regulation_text]
{regulation_text}
"""
    ).partial(format_instructions=parser.get_format_instructions())

    chain = (
        {
            "context": itemgetter("regulation_text") | retriever | RunnableLambda(format_docs),
            "regulation_text": itemgetter("regulation_text"),
        }
        | prompt
        | llm
        | parser
    )
    return chain


def make_compiler_chain():
    llm = llm_compiler()
    parser = PydanticOutputParser(pydantic_object=RuleSet)

    prompt = ChatPromptTemplate.from_template(
        """당신은 Policy-as-Code 컴파일러다.
정규화된 정책을 아래 8개 룰 타입으로 컴파일하라.

[허용 룰 타입]
1) FORBIDDEN_PHRASE (pattern=문구)
2) REQUIRED_PHRASE (pattern=문구)
3) REGEX_MUST_MATCH (pattern=regex)
4) REGEX_MUST_NOT_MATCH (pattern=regex)
5) REQUIRED_SECTION_HEADING (pattern=헤딩 텍스트, 예: "제출 정보")
6) REQUIRED_KV_FIELD (target_key=키, 예:"제출자 이름")
7) KV_FIELD_REGEX (target_key=키, pattern=regex)
8) KV_FIELD_ALLOWED_VALUES (target_key=키, allowed_values=[...])

[규칙]
- rule_id는 R-001 형식 권장
- 각 rule은 clause_id를 반드시 참조
- severity는 error/warn
- message는 사용자에게 보여줄 짧은 한국어 문장
- fix_hint에는 대체 문구/추가 문구/필드 예시를 적어라(가능하면)

{format_instructions}

[NormalizedPolicy JSON]
{policy_json}
"""
    ).partial(format_instructions=parser.get_format_instructions())

    chain = (
        RunnablePassthrough.assign(policy_json=lambda x: x["policy"].model_dump_json(indent=2))
        | prompt
        | llm
        | parser
    )
    return chain


def make_test_generator_chain():
    llm = llm_normalizer()  # 비용/속도 고려해 gpt-4o-mini로
    parser = PydanticOutputParser(pydantic_object=TestSuite)

    prompt = ChatPromptTemplate.from_template(
        """당신은 정책 룰셋으로부터 테스트(통과/실패 예시)를 생성한다.

[목표]
- 최소 6개 테스트 생성
- PASS 케이스(violations empty) 포함
- FAIL 케이스는 특정 rule_id 위반을 유도

{format_instructions}

[RuleSet JSON]
{rules_json}
"""
    ).partial(format_instructions=parser.get_format_instructions())

    chain = (
        RunnablePassthrough.assign(rules_json=lambda x: x["ruleset"].model_dump_json(indent=2))
        | prompt
        | llm
        | parser
    )
    return chain


# =========================================================
# 6) 로컬 룰러너 (핵심: 재현 가능)
# =========================================================

KV_RE = re.compile(r"^\s*([^:\n\r]+)\s*[:：]\s*(.+)\s*$")


def parse_kv(doc_text: str) -> Dict[str, str]:
    kv = {}
    for line in doc_text.splitlines():
        m = KV_RE.match(line)
        if m:
            key = m.group(1).strip()
            val = m.group(2).strip()
            kv[key] = val
    return kv


def extract_headings(doc_text: str) -> List[str]:
    # markdown heading: #, ##, ### ...
    headings = []
    for line in doc_text.splitlines():
        if re.match(r"^\s*#{1,6}\s+\S+", line):
            headings.append(re.sub(r"^\s*#{1,6}\s+", "", line).strip())
    return headings


def apply_rules(doc_text: str, ruleset: RuleSet) -> List[Violation]:
    violations: List[Violation] = []
    kv = parse_kv(doc_text)
    headings = extract_headings(doc_text)

    for r in ruleset.rules:
        rt = r.rule_type

        def add(evidence: str):
            violations.append(
                Violation(
                    rule_id=r.rule_id,
                    clause_id=r.clause_id,
                    severity=r.severity,
                    evidence=evidence,
                    message=r.message,
                )
            )

        if rt == "FORBIDDEN_PHRASE":
            if r.pattern and r.pattern in doc_text:
                add(r.pattern)

        elif rt == "REQUIRED_PHRASE":
            if r.pattern and r.pattern not in doc_text:
                add(f"(missing) {r.pattern}")

        elif rt == "REGEX_MUST_MATCH":
            if r.pattern and re.search(r.pattern, doc_text) is None:
                add(f"(no match) /{r.pattern}/")

        elif rt == "REGEX_MUST_NOT_MATCH":
            if r.pattern and re.search(r.pattern, doc_text) is not None:
                add(f"(matched forbidden) /{r.pattern}/")

        elif rt == "REQUIRED_SECTION_HEADING":
            if r.pattern and r.pattern not in headings:
                add(f"(missing heading) {r.pattern}")

        elif rt == "REQUIRED_KV_FIELD":
            if not r.target_key or r.target_key not in kv:
                add(f"(missing field) {r.target_key}")

        elif rt == "KV_FIELD_REGEX":
            if not r.target_key:
                add("(invalid rule: missing target_key)")
            else:
                val = kv.get(r.target_key)
                if val is None:
                    add(f"(missing field) {r.target_key}")
                elif not r.pattern or re.search(r.pattern, val) is None:
                    add(f"{r.target_key}: {val}  (must match /{r.pattern}/)")

        elif rt == "KV_FIELD_ALLOWED_VALUES":
            if not r.target_key:
                add("(invalid rule: missing target_key)")
            else:
                val = kv.get(r.target_key)
                if val is None:
                    add(f"(missing field) {r.target_key}")
                else:
                    allowed = r.allowed_values or []
                    if val not in allowed:
                        add(f"{r.target_key}: {val}  (allowed={allowed})")

    return violations


def evaluate_tests_locally(ruleset: RuleSet, testsuite: TestSuite) -> Dict[str, Any]:
    results = []
    for t in testsuite.tests:
        got = sorted([v.rule_id for v in apply_rules(t.doc_text, ruleset)])
        exp = sorted(t.expected_violations)
        results.append({"test_id": t.test_id, "expected": exp, "got": got, "pass": got == exp})
    return {"results": results}


# =========================================================
# 7) Verifier / Fixer / Auditor
# =========================================================

def make_verifier_chain():
    llm = llm_verifier()
    parser = PydanticOutputParser(pydantic_object=VerificationReport)

    prompt = ChatPromptTemplate.from_template(
        """당신은 룰셋 검증(Verifier) 에이전트다.

[입력]
- rules_json: 룰셋
- tests_json: 테스트
- local_eval_json: 로컬 실행 결과

[할 일]
1) mismatch(기대 vs 실제) 원인 분석
2) 오탐/미탐을 줄이기 위한 룰 튜닝 제안(suggested_rule_tweaks)
3) summary는 5줄 이내

{format_instructions}

[rules_json]
{rules_json}

[tests_json]
{tests_json}

[local_eval_json]
{local_eval_json}
"""
    ).partial(format_instructions=parser.get_format_instructions())

    return prompt | llm | parser


def make_fixer_chain():
    llm = llm_fixer()

    prompt = ChatPromptTemplate.from_template(
        """당신은 문서 자동 수정(Fixer) 에이전트다.

[원칙]
- 위반된 부분만 최소 수정(과수정 금지)
- 원문 의미 유지
- 출력은 "수정된 문서 전체 텍스트"만 (설명 금지)

[rules_json]
{rules_json}

[violations_json]
{violations_json}

[doc_text]
{doc_text}
"""
    )
    return prompt | llm | StrOutputParser()


def make_auditor_chain():
    llm = llm_auditor()
    parser = PydanticOutputParser(pydantic_object=AuditLog)

    prompt = ChatPromptTemplate.from_template(
        """당신은 감사 로그(Auditor) 에이전트다.

[decision rule]
- error 위반이 있으면 decision=fix_suggested
- warn만 있으면 decision=warn
- 위반이 없으면 decision=pass

[요구]
- entries 배열에 (위반 또는 pass) 모두 기록
- rationale에는 "어떤 규칙/조항 때문에"를 1~2문장으로

{format_instructions}

[doc_id] {doc_id}

[violations_json]
{violations_json}
"""
    ).partial(format_instructions=parser.get_format_instructions())

    return prompt | llm | parser


# =========================================================
# 8) diff + (API-friendly) 오케스트레이터
# =========================================================

def unified_diff(old: str, new: str, fromfile="before", tofile="after") -> str:
    return "".join(
        difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile=fromfile, tofile=tofile)
    )

def run_normalize(policy_id: str, regulation_text: str, knowledge_docs: List[Dict[str, str]]):
    import logging
    logger = logging.getLogger(__name__)

    logger.info("Starting normalize process...")

    kb_docs = [
        Document(page_content=d["content"], metadata={"source": d.get("id", "kb")})
        for d in (knowledge_docs or [])
    ]
    all_docs = kb_docs + [Document(page_content=regulation_text, metadata={"source": "regulation"})]

    logger.info(f"Created {len(all_docs)} documents")
    vs = build_vectorstore(all_docs)
    retriever = vs.as_retriever(search_type="mmr", search_kwargs={"k": 6, "fetch_k": 20})

    normalizer = make_normalizer_chain(retriever)

    policy: NormalizedPolicy = normalizer.invoke({"regulation_text": regulation_text})
    try:
        policy.policy_id = policy_id
    except Exception:
        pass

    logger.info(f"Policy normalized: {len(policy.clauses)} clauses")
    return {"normalized_policy": policy.model_dump()}


def run_build(policy_id: str, regulation_text: str, knowledge_docs: List[Dict[str, str]]):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting build process...")
        kb_docs = [Document(page_content=d["content"], metadata={"source": d.get("id", "kb")}) for d in (knowledge_docs or [])]
        all_docs = kb_docs + [Document(page_content=regulation_text, metadata={"source": "regulation"})]
        logger.info(f"Created {len(all_docs)} documents")

        logger.info("Building vectorstore...")
        vs = build_vectorstore(all_docs)
        retriever = vs.as_retriever(search_type="mmr", search_kwargs={"k": 6, "fetch_k": 20})
        logger.info("Vectorstore built successfully")

        logger.info("Initializing chains...")
        normalizer = make_normalizer_chain(retriever)
        compiler = make_compiler_chain()
        testgen = make_test_generator_chain()
        verifier = make_verifier_chain()
        logger.info("Chains initialized successfully")

        logger.info("Running normalizer...")
        policy: NormalizedPolicy = normalizer.invoke({"regulation_text": regulation_text})
        # align policy id if missing/wrong
        try:
            policy.policy_id = policy_id
        except Exception:
            pass
        logger.info(f"Policy normalized: {len(policy.clauses)} clauses")

        logger.info("Running compiler...")
        ruleset: RuleSet = compiler.invoke({"policy": policy})
        logger.info(f"Ruleset compiled: {len(ruleset.rules)} rules")

        logger.info("Running test generator...")
        testsuite: TestSuite = testgen.invoke({"ruleset": ruleset})
        logger.info(f"Testsuite generated: {len(testsuite.tests)} test cases")

        logger.info("Evaluating tests locally...")
        local_eval = evaluate_tests_locally(ruleset, testsuite)
        logger.info("Local evaluation completed")

        logger.info("Running verifier...")
        v_report: VerificationReport = verifier.invoke(
            {
                "rules_json": ruleset.model_dump_json(indent=2),
                "tests_json": testsuite.model_dump_json(indent=2),
                "local_eval_json": local_eval,
            }
        )
        logger.info("Verification completed")

        return {
            "normalized_policy": policy.model_dump(),
            "ruleset": ruleset.model_dump(),
            "testsuite": testsuite.model_dump(),
            "verification_report": v_report.model_dump(),
        }
    except Exception as e:
        logger.error(f"Error in run_build: {str(e)}", exc_info=True)
        raise


def run_lint(ruleset_dict: Dict[str, Any], docs: List[Dict[str, str]]):
    ruleset = RuleSet.model_validate(ruleset_dict)

    fixer = make_fixer_chain()
    auditor = make_auditor_chain()

    per_doc: Dict[str, Any] = {}

    for d in docs:
        doc_id = d["id"]
        doc_text = d["content"]

        violations = apply_rules(doc_text, ruleset)

        fixed_text = doc_text
        diff_text = ""

        # error 있을 때만 fixer (과수정 방지)
        if any(v.severity == "error" for v in violations):
            fixed_text = fixer.invoke(
                {
                    "rules_json": ruleset.model_dump_json(indent=2),
                    "violations_json": [v.model_dump() for v in violations],
                    "doc_text": doc_text,
                }
            ).strip() or doc_text

            diff_text = unified_diff(doc_text, fixed_text, f"{doc_id}.before", f"{doc_id}.after")

        a_log: AuditLog = auditor.invoke({"doc_id": doc_id, "violations_json": [v.model_dump() for v in violations]})

        per_doc[doc_id] = {
            "violations": [v.model_dump() for v in violations],
            "diff": diff_text,
            "audit_log": a_log.model_dump(),
        }

    return {"per_doc": per_doc}
