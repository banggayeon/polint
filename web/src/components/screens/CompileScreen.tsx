import { ChevronLeft, ChevronRight, Save, Code2, FileJson } from "lucide-react";
import { useMemo, useState } from "react";
import YAML from "yaml";

import { buildPolicy, type Rule } from "../../lib/polintApi";
import { usePolint } from "../../lib/polintStore";

interface CompileScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export function CompileScreen({ onNext, onBack }: CompileScreenProps) {
  const [activeTab, setActiveTab] = useState<"yaml" | "json">("yaml");
  const { state, setState } = usePolint();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ demo 데이터가 아니라, 실제 buildPolicy 응답으로 받은 ruleset을 렌더링
  const rules = state.ruleset?.rules ?? [];

  const rulesetYaml = useMemo(() => {
    if (!state.ruleset) return "# 아직 룰셋이 없습니다. '룰 컴파일 실행'을 눌러 생성하세요.";
    return YAML.stringify(state.ruleset);
  }, [state.ruleset]);

  const rulesetJson = useMemo(() => {
    if (!state.ruleset) return "{}";
    return JSON.stringify(state.ruleset, null, 2);
  }, [state.ruleset]);

  const handleBuild = async () => {
    if (!state.policyId) {
      setError("먼저 1단계에서 규정을 업로드해 Policy ID를 생성하세요.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const resp = await buildPolicy(state.policyId, state.knowledgeDocs ?? []);

      // ✅ build 결과를 전역 state에 저장해 Step3/Step4에서 실제 데이터를 사용
      setState((s) => ({
        ...s,
        rulesetId: resp.rulesetId,
        ruleset: resp.ruleset,
        testsuite: resp.testsuite,
        verificationReport: resp.verificationReport,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = activeTab === "yaml" ? rulesetYaml : rulesetJson;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("클립보드 복사에 실패했습니다. (브라우저 권한/HTTPS 여부를 확인하세요)");
    }
  };

  const getSeverityColor = (severity: Rule["severity"]) => {
    return severity === "error"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const renderCondition = (r: Rule) => {
    if (r.rule_type.includes("KV_FIELD") && r.target_key) {
      if (r.rule_type === "KV_FIELD_ALLOWED_VALUES") {
        return `${r.target_key} ∈ [${(r.allowed_values ?? []).join(", ")}]`;
      }
      if (r.pattern) return `${r.target_key} matches ${r.pattern}`;
      return `required: ${r.target_key}`;
    }
    if (r.pattern) return r.pattern;
    return r.rule_type;
  };

  const canGoNext = Boolean(state.rulesetId);

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">룰 컴파일</h2>
          <p className="text-slate-600 mt-1">추출된 조항을 실행 가능한 룰로 변환합니다</p>
          <p className="text-xs text-slate-500 mt-2">
            Policy ID: <span className="font-mono">{state.policyId ?? "(없음)"}</span> · Ruleset ID:{" "}
            <span className="font-mono">{state.rulesetId ?? "(아직 생성되지 않음)"}</span>
          </p>
          {state.testsuite ? (
            <p className="text-xs text-slate-500 mt-1">
              생성된 테스트: <span className="font-mono">{state.testsuite.tests.length}</span>
              {state.verificationReport?.summary ? (
                <>
                  {" "}· 검증 요약: <span className="font-mono">{state.verificationReport.summary}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">정책 메타데이터</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">룰셋 이름</label>
                  <input
                    type="text"
                    defaultValue={state.ruleset?.policy_id ?? "(auto)"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">버전</label>
                  <input
                    type="text"
                    defaultValue="1.0.0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">원본 문서</label>
                  <input
                    type="text"
                    defaultValue="(auto)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">생성된 룰 ({rules.length})</h3>

              {rules.length === 0 ? (
                <div className="text-sm text-slate-600">
                  아직 생성된 룰이 없습니다. 아래의 <span className="font-medium">룰 컴파일 실행</span>을 눌러 규정에서
                  룰을 생성하세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((r) => (
                    <div key={r.rule_id} className="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {r.rule_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(r.severity)}`}>
                            {r.severity.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">→ {r.clause_id}</span>
                      </div>

                      <h4 className="font-medium text-slate-900 text-sm mb-1">{r.rule_type}</h4>
                      <p className="text-xs text-slate-700 mb-1">{r.message}</p>
                      {r.fix_hint ? <p className="text-xs text-slate-500 mb-2">fix: {r.fix_hint}</p> : <div className="h-2" />}

                      <div className="bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
                        <code className="text-xs text-slate-700 font-mono">{renderCondition(r)}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
            <div className="border-b border-slate-200 p-4 flex items-center justify-between bg-slate-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("yaml")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "yaml"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    YAML
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("json")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "json"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    JSON
                  </div>
                </button>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                복사
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-900">
              <pre className="text-sm text-slate-100 font-mono leading-relaxed">
                <code>{activeTab === "yaml" ? rulesetYaml : rulesetJson}</code>
              </pre>
            </div>
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

          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
              <Save className="w-4 h-4" />
              룰셋 저장
            </button>

            {!canGoNext ? (
              <button
                onClick={handleBuild}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "컴파일 중..." : "룰 컴파일 실행"}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                테스트 생성/검증으로 이동
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">오류: {error}</div>
        ) : null}
      </div>
    </div>
  );
}
