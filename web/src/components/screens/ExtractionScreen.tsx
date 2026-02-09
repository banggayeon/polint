import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { normalizePolicy } from "../../lib/polintApi";
import { usePolint } from "../../lib/polintStore";

interface ExtractionScreenProps {
  onNext: () => void;
  onBack: () => void;
}

function severityFromModality(modality: string) {
  // MUST/MUST_NOT는 error, SHOULD는 warn, MAY는 info 느낌
  if (modality === "MUST" || modality === "MUST_NOT") return "error";
  if (modality === "SHOULD") return "warn";
  return "info";
}

export function ExtractionScreen({ onNext, onBack }: ExtractionScreenProps) {
  const { state, setState } = usePolint();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = state.normalizedPolicy;
  const clauses = normalized?.clauses ?? [];
  const openQuestions = normalized?.open_questions ?? [];

  // open_questions 답변(프론트 로컬)
  const [answers, setAnswers] = useState<Record<string, string>>(state.hitlAnswers ?? {});

  const canRun = !!state.policyId;

  const runNormalize = async () => {
    if (!state.policyId) {
      setError("먼저 1단계에서 규정을 업로드해 Policy ID를 생성하세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await normalizePolicy(state.policyId, state.knowledgeDocs ?? []);
      setState((s) => ({
        ...s,
        normalizedPolicy: resp.normalizedPolicy,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step2 진입 시 자동으로 normalize 실행(결과 없을 때만)
  useEffect(() => {
    if (state.policyId && !state.normalizedPolicy) {
      runNormalize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.policyId]);

  // open_questions → Step3로 넘길 knowledgeDocs 생성
  const generatedHitlDocs = useMemo(() => {
    const docs = openQuestions
      .map((q, idx) => {
        const key = String(idx);
        const a = (answers[key] ?? "").trim();
        if (!a) return null;
        return {
          title: `HITL Q${idx + 1}`,
          content: `Q: ${q}\nA: ${a}`,
        };
      })
      .filter(Boolean);
    return docs as { title: string; content: string }[];
  }, [answers, openQuestions]);

  const handleConfirm = () => {
    // ✅ Step2에서 만든 HITL 답변을 knowledgeDocs로 저장 → Step3(build)에 그대로 전달 가능
    setState((s) => ({
      ...s,
      hitlAnswers: answers,
      knowledgeDocs: generatedHitlDocs,
    }));
    onNext();
  };

  return (
    <div className="h-full bg-slate-50 flex">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">조항 추출 및 정규화</h2>
          <div className="mt-2 text-sm text-slate-600 flex flex-col gap-1">
            <div>
              Policy ID:{" "}
              <span className="font-mono text-xs bg-white border border-slate-200 px-2 py-1 rounded">
                {state.policyId ?? "(없음)"}
              </span>
            </div>
            <div>총 {clauses.length}개의 조항</div>
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              오류: {error}
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="text-sm font-medium text-slate-700">정규화 결과</div>
            <button
              onClick={runNormalize}
              disabled={!canRun || loading}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "정규화 중..." : "다시 추출"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">조항 ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Modality</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Object</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Condition/Exception</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clauses.map((c) => {
                  const sev = severityFromModality(c.modality);
                  const sevBadge =
                    sev === "error"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : sev === "warn"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={c.clause_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded">
                          {c.clause_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${sevBadge}`}>
                          {c.modality}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">{c.subject}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{c.action}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{c.obj}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {c.condition ? <div>조건: {c.condition}</div> : null}
                        {c.exception ? <div>예외: {c.exception}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{c.ambiguity_notes ?? ""}</td>
                    </tr>
                  );
                })}

                {!loading && clauses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                      정규화 결과가 없습니다. (Policy ID 생성 후 다시 시도하세요)
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading || clauses.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            정규화 확정
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HITL Side Panel */}
      <div className="w-96 bg-white border-l border-slate-200 p-6 overflow-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            애매한 조항 질문
          </h3>
          <p className="text-sm text-slate-600 mt-1">open_questions 기반 (agent 결과)</p>
        </div>

        {openQuestions.length === 0 ? (
          <div className="text-sm text-slate-500">현재 open_questions가 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {openQuestions.map((q, idx) => {
              const key = String(idx);
              return (
                <div key={key} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="font-mono text-xs font-medium text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200">
                      Q{idx + 1}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 mb-3 leading-relaxed">{q}</p>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">답변 입력</label>
                    <textarea
                      value={answers[key] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="명확한 답변을 입력하세요..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-xs text-slate-500">
          입력한 답변은 Step3(룰 컴파일)에서 knowledgeDocs로 전달되도록 저장됩니다.
        </div>
      </div>
    </div>
  );
}
