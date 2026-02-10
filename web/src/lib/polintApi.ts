export type ApiError = {
  code?: string;
  message?: string;
  details?: unknown;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

export type CreatePolicyResponse = {
  policyId: string;
  version: string;
};

export type BuildPolicyResponse = {
  policyId: string;
  rulesetId: string;

  // Step3에서 실제 결과 표시용
  normalizedPolicy?: unknown;
  ruleset?: RuleSet;
  testsuite?: TestSuite;
  verificationReport?: VerificationReport;
};

// ===== Agent build 결과 타입 (agent/polint_lcel.py 스키마 기준) =====
export type RuleType =
  | "FORBIDDEN_PHRASE"
  | "REQUIRED_PHRASE"
  | "REGEX_MUST_MATCH"
  | "REGEX_MUST_NOT_MATCH"
  | "REQUIRED_SECTION_HEADING"
  | "REQUIRED_KV_FIELD"
  | "KV_FIELD_REGEX"
  | "KV_FIELD_ALLOWED_VALUES";

export type Rule = {
  rule_id: string;
  clause_id: string;
  severity: "error" | "warn";
  rule_type: RuleType;
  pattern?: string | null;
  target_key?: string | null;
  allowed_values?: string[] | null;
  message: string;
  fix_hint?: string | null;
};

export type RuleSet = {
  policy_id: string;
  rules: Rule[];
};

export type TestCase = {
  test_id: string;
  doc_text: string;
  expected_violations: string[];
};

export type TestSuite = {
  tests: TestCase[];
};

export type VerificationReport = {
  summary: string;
  mismatches?: string[];
  suggested_rule_tweaks?: string[];
};

export type DocDto = {
  title: string;
  content: string;
};

export type LintResponse = {
  runId: string;
};

export type GetRunResponse = {
  runId: string;
  rulesetId: string;
  resultJson: string;
};

export type ExtractTextResponse = {
  title?: string;
  text: string;
  sourceType: "file" | "url";
  mimeType?: string;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1";

const DEMO_ONLY = (import.meta.env.VITE_DEMO_ONLY as string | undefined) === "true";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !body.success) {
    const msg = body?.error?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  if (body.data === undefined) {
    throw new Error("Malformed response: missing data");
  }

  return body.data;
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: form,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    const msg = body?.error?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  if (body.data === undefined) throw new Error("Malformed response: missing data");
  return body.data;
}

export async function extractTextFromFile(file: File): Promise<ExtractTextResponse> {
  if (DEMO_ONLY) {
    throw new Error("데모(프론트-only) 모드에서는 PDF/DOCX 추출을 지원하지 않습니다. TXT/MD로 업로드하세요.");
  }
  const form = new FormData();
  form.append("file", file);
  return requestForm<ExtractTextResponse>("/documents/extract/file", form);
}

export async function extractTextFromUrl(url: string): Promise<ExtractTextResponse> {
  return requestJson<ExtractTextResponse>("/documents/extract/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function createPolicy(regulationText: string): Promise<CreatePolicyResponse> {
  if (DEMO_ONLY) {
    await sleep(200);
    return { policyId: "demo-policy-001", version: "demo" };
  }
  return requestJson<CreatePolicyResponse>("/policies", {
    method: "POST",
    body: JSON.stringify({ regulationText }),
  });
}

export async function buildPolicy(policyId: string, knowledgeDocs: DocDto[] = []): Promise<BuildPolicyResponse> {
  if (DEMO_ONLY) {
    await sleep(200);
    return { policyId, rulesetId: "demo-ruleset-001" };
  }
  return requestJson<BuildPolicyResponse>(`/policies/${encodeURIComponent(policyId)}/build`, {
    method: "POST",
    body: JSON.stringify({ knowledgeDocs }),
  });
}

export async function lint(rulesetId: string, docs: DocDto[]): Promise<LintResponse> {
  if (DEMO_ONLY) {
    await sleep(300);
    return { runId: "demo-run-001" };
  }
  return requestJson<LintResponse>("/lint", {
    method: "POST",
    body: JSON.stringify({ rulesetId, docs }),
  });
}

export async function getRun(runId: string): Promise<GetRunResponse> {
  if (DEMO_ONLY) {
    await sleep(200);
    const resultJson = JSON.stringify({
      per_doc: {
        "개인정보 처리방침_v1.2.pdf": {
          violations: [
            { rule_id: "RULE-004", severity: "error", message: '고유식별정보 "주민등록번호" 검출', line: 12, clause_ref: "POL-004" },
            { rule_id: "RULE-003", severity: "error", message: "비밀번호 정책 미준수: 최소 8자/특수문자 필요", line: 16, clause_ref: "POL-003" },
          ],
          diff: "--- a/doc\n+++ b/doc\n@@ -1,1 +1,1 @@\n-주민등록번호\n+",
          audit_log: { events: [{ timestamp: new Date().toISOString(), action: "violation_detected", detail: "데모 로그", severity: "info" }] },
        },
      },
    }, null, 2);

    return { runId, rulesetId: "demo-ruleset-001", resultJson };
  }

  return requestJson<GetRunResponse>(`/runs/${encodeURIComponent(runId)}`, { method: "GET" });
}

// ✅ 추가: Normalizer 결과 타입
export type Modality = "MUST" | "MUST_NOT" | "SHOULD" | "MAY";

export type Clause = {
  clause_id: string;
  modality: Modality;
  subject: string;
  action: string;
  obj: string;
  condition?: string | null;
  exception?: string | null;
  ambiguity_notes?: string | null;
};

export type NormalizedPolicy = {
  policy_id: string;
  clauses: Clause[];
  open_questions: string[];
};

// ✅ Spring이 내려주는 data 형태(우리가 제안한 스펙)
// data: { policyId: "...", normalizedPolicy: { policy_id, clauses, open_questions } }
export type NormalizePolicyResponse = {
  policyId: string;
  normalizedPolicy: NormalizedPolicy;
};

export async function normalizePolicy(policyId: string, knowledgeDocs: DocDto[] = []): Promise<NormalizePolicyResponse> {
  return requestJson<NormalizePolicyResponse>(`/policies/${encodeURIComponent(policyId)}/normalize`, {
    method: "POST",
    body: JSON.stringify({ knowledgeDocs }),
  });
}
