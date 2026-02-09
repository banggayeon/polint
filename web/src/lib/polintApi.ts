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
  sourceType: string;
  mimeType?: string;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1";

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
  return requestJson<CreatePolicyResponse>("/policies", {
    method: "POST",
    body: JSON.stringify({ regulationText }),
  });
}

export async function buildPolicy(policyId: string, knowledgeDocs: DocDto[] = []): Promise<BuildPolicyResponse> {
  return requestJson<BuildPolicyResponse>(`/policies/${encodeURIComponent(policyId)}/build`, {
    method: "POST",
    body: JSON.stringify({ knowledgeDocs }),
  });
}

export async function lint(rulesetId: string, docs: DocDto[]): Promise<LintResponse> {
  return requestJson<LintResponse>("/lint", {
    method: "POST",
    body: JSON.stringify({ rulesetId, docs }),
  });
}

export async function getRun(runId: string): Promise<GetRunResponse> {
  return requestJson<GetRunResponse>(`/runs/${encodeURIComponent(runId)}`, {
    method: "GET",
  });
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
