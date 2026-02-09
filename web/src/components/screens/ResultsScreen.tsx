import { ChevronLeft, Download, FileText, AlertCircle, CheckCircle, Activity, Clock } from 'lucide-react';
import { useState } from 'react';
import { usePolint } from '../../lib/polintStore';

interface ResultsScreenProps {
  onBack: () => void;
}


const diffSuggestions = [
  {
    id: 'DIFF-001',
    file: '개인정보 처리방침_v1.2.pdf',
    line: 12,
    type: 'remove' as const,
    original: '- 선택항목: 주소, 주민등록번호',
    suggested: '- 선택항목: 주소',
    reason: 'POL-004: 고유식별정보 수집 금지',
  },
  {
    id: 'DIFF-002',
    file: '개인정보 처리방침_v1.2.pdf',
    line: 16,
    type: 'replace' as const,
    original: '- 최소 6자 이상',
    suggested: '- 최소 8자 이상',
    reason: 'POL-003: 비밀번호 복잡도 정책',
  },
  {
    id: 'DIFF-003',
    file: '개인정보 처리방침_v1.2.pdf',
    line: 17,
    type: 'replace' as const,
    original: '- 영문 또는 숫자 조합',
    suggested: '- 영문, 숫자, 특수문자 조합 필수',
    reason: 'POL-003: 비밀번호 복잡도 정책',
  },
  {
    id: 'DIFF-004',
    file: '개인정보 처리방침_v1.2.pdf',
    line: 20,
    type: 'replace' as const,
    original: '개인정보는 AES-128 알고리즘으로 암호화하여 저장합니다.',
    suggested: '개인정보는 AES-256 이상의 알고리즘으로 암호화하여 저장합니다.',
    reason: 'POL-002: 암호화 알고리즘 요구사항',
  },
  {
    id: 'DIFF-005',
    file: '개인정보 처리방침_v1.2.pdf',
    line: 24,
    type: 'insert' as const,
    original: '',
    suggested: '제6조 (개인정보 보호책임자)\n개인정보 보호책임자: 홍길동\n이메일: privacy@company.com\n전화: 02-1234-5678',
    reason: 'POL-001: CPO 연락처 공개 필수',
  },
];

const auditLog = [
  {
    id: 'LOG-001',
    timestamp: '2026-02-03 10:45:23',
    action: 'violation_detected',
    clauseId: 'POL-004',
    ruleId: 'RULE-004',
    document: '개인정보 처리방침_v1.2.pdf',
    detail: '고유식별정보 "주민등록번호" 검출 (Line 12)',
    severity: 'error' as const,
  },
  {
    id: 'LOG-002',
    timestamp: '2026-02-03 10:45:24',
    action: 'violation_detected',
    clauseId: 'POL-003',
    ruleId: 'RULE-003',
    document: '개인정보 처리방침_v1.2.pdf',
    detail: '비밀번호 정책 미준수: 최소 길이 6자 (요구사항: 8자 이상)',
    severity: 'error' as const,
  },
  {
    id: 'LOG-003',
    timestamp: '2026-02-03 10:45:24',
    action: 'violation_detected',
    clauseId: 'POL-003',
    ruleId: 'RULE-003',
    document: '개인정보 처리방침_v1.2.pdf',
    detail: '비밀번호 정책 미준수: 특수문자 미포함',
    severity: 'error' as const,
  },
  {
    id: 'LOG-004',
    timestamp: '2026-02-03 10:45:25',
    action: 'violation_detected',
    clauseId: 'POL-002',
    ruleId: 'RULE-002',
    document: '개인정보 처리방침_v1.2.pdf',
    detail: '암호화 알고리즘 미준수: AES-128 사용 (요구사항: AES-256 이상)',
    severity: 'error' as const,
  },
  {
    id: 'LOG-005',
    timestamp: '2026-02-03 10:45:26',
    action: 'violation_detected',
    clauseId: 'POL-001',
    ruleId: 'RULE-001',
    document: '개인정보 처리방침_v1.2.pdf',
    detail: 'CPO 연락처 정보 누락',
    severity: 'error' as const,
  },
  {
    id: 'LOG-006',
    timestamp: '2026-02-03 10:45:27',
    action: 'suggestion_generated',
    clauseId: 'POL-004',
    ruleId: 'RULE-004',
    document: '개인정보 처리방침_v1.2.pdf',
    detail: '수정 제안 생성: "주민등록번호" 제거',
    severity: 'info' as const,
  },
  {
    id: 'LOG-007',
    timestamp: '2026-02-03 10:45:28',
    action: 'compliance_check',
    clauseId: 'POL-005',
    ruleId: 'RULE-005',
    document: '개인정보 처리방침_v1.2.pdf',
    detail: '동의서 명시 확인 완료',
    severity: 'success' as const,
  },
];

const testResults = [
  { name: 'RULE-001 테스트', passed: 2, failed: 0, total: 2 },
  { name: 'RULE-002 테스트', passed: 2, failed: 0, total: 2 },
  { name: 'RULE-003 테스트', passed: 2, failed: 0, total: 2 },
  { name: 'RULE-004 테스트', passed: 2, failed: 0, total: 2 },
];

interface ParsedResult {
  per_doc: Record<string, {
    violations: Array<{
      id?: string;
      rule_id?: string;
      severity: 'error' | 'warn';
      message: string;
      line?: number;
      text?: string;
      clause_ref?: string;
    }>;
    diff?: string;
    audit_log?: {
      events: Array<{
        timestamp: string;
        action: string;
        detail: string;
        severity: string;
        rule_id?: string;
        clause_id?: string;
      }>;
    };
  }>;
}

export function ResultsScreen({ onBack }: ResultsScreenProps) {
  const [activeTab, setActiveTab] = useState<'violations' | 'diff' | 'audit' | 'tests'>('violations');
  const { state } = usePolint();

  const rawResult = state.lastRun?.resultJson;
  const parsedResult: ParsedResult | null = (() => {
    if (!rawResult) return null;
    try {
      return JSON.parse(rawResult);
    } catch {
      return null;
    }
  })();

  const prettyResult = parsedResult ? JSON.stringify(parsedResult, null, 2) : null;

  const perDoc = (() => {
    if (!parsedResult || typeof parsedResult !== "object") return {};
    const anyRes = parsedResult as any;
  
    // 정상(신규) 포맷: { per_doc: {...} }
    if (anyRes.per_doc && typeof anyRes.per_doc === "object") return anyRes.per_doc;
  
    // 구버전 포맷: { "DOC-...": {...} } (per_doc 키 없음)
    return anyRes;
  })() as Record<string, any>;

  // 실제 API 결과에서 통계 계산
  const allViolations = Object.values(perDoc).flatMap((doc: any) => doc?.violations ?? []);
  const totalViolations = allViolations.length;
  const errorCount = allViolations.filter((v: any) => v?.severity === "error").length;
  const warnCount = allViolations.filter((v: any) => v?.severity === "warn").length;
  const suggestionsCount = Object.values(perDoc).filter((doc: any) => !!doc?.diff).length;
  const testPassRate = 100; // 테스트 결과는 아직 구현되지 않음

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">검사 결과 대시보드</h2>
            <p className="text-slate-600 mt-1">전체 위반 사항 및 수정 제안을 확인하세요</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">
              <Download className="w-4 h-4" />
              PDF 리포트
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">
              <Download className="w-4 h-4" />
              JSON 로그
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">
              <Download className="w-4 h-4" />
              룰셋 YAML
            </button>
          </div>
        </div>

			{prettyResult ? (
				<div className="mb-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
						<div>
							<h3 className="text-sm font-semibold text-slate-900">실제 검사 결과 (API)</h3>
							<p className="text-xs text-slate-600 mt-1">
								Run ID: <span className="font-mono">{state.lastRun?.runId}</span> · Ruleset ID: <span className="font-mono">{state.lastRun?.rulesetId ?? state.rulesetId}</span>
							</p>
						</div>
						<div className="text-xs text-slate-500">
							(아래 탭 UI는 데모 데이터이며, 이 블록만 실제 백엔드 응답을 보여줍니다)
						</div>
					</div>
					<pre className="p-6 bg-slate-900 text-slate-100 text-xs overflow-auto max-h-72"><code>{prettyResult}</code></pre>
				</div>
			) : (
				<div className="mb-6 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-700">
					아직 실제 API 결과가 없습니다. 4단계에서 <span className="font-medium">결과 보기</span>를 눌러 검사 후 확인하세요.
				</div>
			)}

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{totalViolations}</div>
            <p className="text-sm text-slate-600">총 위반 수</p>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="text-red-600 font-medium">{errorCount} errors</span>
              <span className="text-slate-400">•</span>
              <span className="text-yellow-600 font-medium">{warnCount} warnings</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-teal-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{suggestionsCount}</div>
            <p className="text-sm text-slate-600">수정 제안</p>
            <div className="mt-3 text-xs text-slate-500">자동 생성됨</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">{testPassRate}%</div>
            <p className="text-sm text-slate-600">테스트 통과율</p>
            <div className="mt-3 text-xs text-slate-500">8/8 통과</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-3xl font-semibold text-slate-900 mb-1">3</div>
            <p className="text-sm text-slate-600">검사 문서</p>
            <div className="mt-3 text-xs text-slate-500">모두 완료</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 flex">
            <button
              onClick={() => setActiveTab('violations')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'violations'
                  ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              위반 리포트
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'diff'
                  ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              수정 Diff
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'audit'
                  ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              감사 로그
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'tests'
                  ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              테스트 결과
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'violations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">위반 사항 상세</h3>
                  <span className="text-sm text-slate-600">총 {totalViolations}건</span>
                </div>

                {parsedResult ? (
                  Object.entries(parsedResult.per_doc).flatMap(([docId, docResult]) => 
                    docResult.violations?.map((violation, idx) => (
                      <div key={`${docId}-${idx}`} className="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              violation.severity === 'error'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }`}>
                              {violation.severity.toUpperCase()}
                            </span>
                            {violation.rule_id && (
                              <>
                                <span className="font-mono text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                                  {violation.rule_id}
                                </span>
                                <span className="text-xs text-slate-500">→</span>
                              </>
                            )}
                            {violation.clause_ref && (
                              <span className="font-mono text-xs text-slate-600">{violation.clause_ref}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-900 mb-2">{violation.message}</p>
                        {violation.text && (
                          <div className="bg-slate-50 rounded border border-slate-200 p-2 mb-2">
                            <code className="text-xs text-slate-700">{violation.text}</code>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{docId}</span>
                          {violation.line !== undefined && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span>Line {violation.line + 1}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )) || []
                  )
                ) : (
                  auditLog.filter(log => log.action === 'violation_detected').map((log) => (
                    <div key={log.id} className="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${
                            log.severity === 'error'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          }`}>
                            {log.severity.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                            {log.ruleId}
                          </span>
                          <span className="text-xs text-slate-500">→</span>
                          <span className="font-mono text-xs text-slate-600">{log.clauseId}</span>
                        </div>
                        <span className="text-xs text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="text-sm text-slate-900 mb-2">{log.detail}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{log.document}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'diff' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">수정 제안 (Side-by-side Diff)</h3>
                  <span className="text-sm text-slate-600">{suggestionsCount}개 제안</span>
                </div>

                {parsedResult ? (
                  Object.entries(parsedResult.per_doc)
                    .filter(([_, docResult]) => docResult.diff)
                    .map(([docId, docResult]) => {
                      const diffLines = docResult.diff?.split('\n') || [];
                      const beforeLines: string[] = [];
                      const afterLines: string[] = [];
                      let currentSection: 'before' | 'after' | null = null;

                      diffLines.forEach(line => {
                        if (line.startsWith('---')) {
                          currentSection = 'before';
                        } else if (line.startsWith('+++')) {
                          currentSection = 'after';
                        } else if (line.startsWith('-')) {
                          beforeLines.push(line.substring(1));
                        } else if (line.startsWith('+')) {
                          afterLines.push(line.substring(1));
                        } else if (line.startsWith('@@')) {
                          // Skip hunk headers
                        } else {
                          beforeLines.push(line);
                          afterLines.push(line);
                        }
                      });

                      return (
                        <div key={docId} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-slate-900">{docId}</span>
                            </div>
                            <span className="px-2 py-1 rounded text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200">
                              DIFF
                            </span>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-slate-200">
                            <div className="p-4 bg-red-50/30">
                              <div className="text-xs font-medium text-slate-600 mb-2">원본</div>
                              <div className="bg-white border border-red-200 rounded p-3 max-h-64 overflow-auto">
                                <pre className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                                  {beforeLines.join('\n') || '(변경 없음)'}
                                </pre>
                              </div>
                            </div>
                            <div className="p-4 bg-green-50/30">
                              <div className="text-xs font-medium text-slate-600 mb-2">수정 제안</div>
                              <div className="bg-white border border-green-200 rounded p-3 max-h-64 overflow-auto">
                                <pre className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                                  {afterLines.join('\n') || '(변경 없음)'}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  diffSuggestions.map((diff) => (
                    <div key={diff.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900">{diff.file}</span>
                        <span className="text-xs text-slate-500">Line {diff.line}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        diff.type === 'remove' 
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : diff.type === 'insert'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>
                        {diff.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-200">
                      <div className="p-4 bg-red-50/30">
                        <div className="text-xs font-medium text-slate-600 mb-2">원본</div>
                        <div className="bg-white border border-red-200 rounded p-3">
                          <code className="text-sm text-slate-900 whitespace-pre-wrap">{diff.original || '(없음)'}</code>
                        </div>
                      </div>
                      <div className="p-4 bg-green-50/30">
                        <div className="text-xs font-medium text-slate-600 mb-2">수정 제안</div>
                        <div className="bg-white border border-green-200 rounded p-3">
                          <code className="text-sm text-slate-900 whitespace-pre-wrap">{diff.suggested}</code>
                        </div>
                      </div>
                      </div>
                      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-xs text-slate-600">
                        <span className="font-medium">이유:</span> {diff.reason}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">감사 로그 타임라인</h3>
                  <span className="text-sm text-slate-600">
                    {parsedResult 
                      ? Object.values(parsedResult.per_doc).reduce((sum, doc) => sum + (doc.audit_log?.events?.length || 0), 0)
                      : auditLog.length}개 이벤트
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                  
                  {parsedResult ? (
                    Object.entries(parsedResult.per_doc).flatMap(([docId, docResult]) =>
                      docResult.audit_log?.events?.map((event, idx) => (
                        <div key={`${docId}-${idx}`} className="relative pl-12 pb-6">
                          <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                            event.severity === 'error' ? 'bg-red-500' :
                            event.severity === 'success' ? 'bg-green-500' :
                            event.severity === 'info' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}></div>
                          
                          <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-xs text-slate-500">{event.timestamp}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                event.severity === 'error' ? 'bg-red-100 text-red-700' :
                                event.severity === 'success' ? 'bg-green-100 text-green-700' :
                                event.severity === 'info' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {event.action}
                              </span>
                            </div>
                            <p className="text-sm text-slate-900 mb-2">{event.detail}</p>
                            <div className="flex items-center gap-3 text-xs">
                              {event.rule_id && (
                                <>
                                  <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    {event.rule_id}
                                  </span>
                                  <span className="text-slate-500">→</span>
                                </>
                              )}
                              {event.clause_id && (
                                <span className="font-mono text-slate-600">{event.clause_id}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )) || []
                    )
                  ) : (
                    auditLog.map((log, index) => (
                    <div key={log.id} className="relative pl-12 pb-6">
                      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                        log.severity === 'error' ? 'bg-red-500' :
                        log.severity === 'success' ? 'bg-green-500' :
                        log.severity === 'info' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                      
                      <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-500">{log.timestamp}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.severity === 'error' ? 'bg-red-100 text-red-700' :
                            log.severity === 'success' ? 'bg-green-100 text-green-700' :
                            log.severity === 'info' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900 mb-2">{log.detail}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {log.ruleId}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className="font-mono text-slate-600">{log.clauseId}</span>
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">테스트 실행 결과</h3>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">모두 통과</span>
                  </div>
                </div>

                {testResults.map((result, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-900">{result.name}</h4>
                      <span className="text-sm text-green-600 font-medium">
                        {result.passed}/{result.total} 통과
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(result.passed / result.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900 mb-1">검증 완료</p>
                      <p className="text-xs text-green-700">
                        모든 테스트가 통과했습니다. 룰셋이 정확하게 작동하고 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
          <button className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
            데모 완료
          </button>
        </div>
      </div>
    </div>
  );
}
