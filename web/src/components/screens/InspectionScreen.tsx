import { ChevronLeft, ChevronRight, Upload, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { getRun, lint } from '../../lib/polintApi';
import { usePolint } from '../../lib/polintStore';

interface InspectionScreenProps {
  onNext: () => void;
  onBack: () => void;
}

const sampleDocuments = [
  {
    id: 'DOC-001',
    name: '개인정보 처리방침_v1.2.pdf',
    status: 'completed' as const,
    size: '2.4 MB',
    violations: 5,
    warnings: 3,
  },
  {
    id: 'DOC-002',
    name: '사용자 약관.docx',
    status: 'completed' as const,
    size: '1.8 MB',
    violations: 2,
    warnings: 1,
  },
  {
    id: 'DOC-003',
    name: '보안정책_2026.pdf',
    status: 'completed' as const,
    size: '3.1 MB',
    violations: 7,
    warnings: 5,
  },
];

const documentContent = `개인정보 처리방침

제1장 총칙

제1조 (목적)
본 처리방침은 회사가 수집하는 개인정보의 항목, 수집 및 이용 목적, 보유 및 이용기간 등에 관한 사항을 정함을 목적으로 합니다.

제2조 (개인정보의 수집 항목)
회사는 다음과 같은 개인정보를 수집합니다:
- 필수항목: 이름, 이메일, 전화번호
- 선택항목: 주소, 주민등록번호

제3조 (비밀번호 정책)
회원 가입 시 비밀번호는 다음 규칙을 따라야 합니다:
- 최소 6자 이상
- 영문 또는 숫자 조합

제4조 (암호화)
개인정보는 AES-128 알고리즘으로 암호화하여 저장합니다.

제5조 (개인정보 보호)
회사는 개인정보를 안전하게 보호하기 위해 최선을 다합니다.`;

const violations = [
  {
    id: 'V-001',
    ruleId: 'RULE-004',
    severity: 'error' as const,
    line: 12,
    text: '선택항목: 주소, 주민등록번호',
    message: '고유식별정보(주민등록번호)는 수집이 금지됩니다',
    clauseRef: 'POL-004',
  },
  {
    id: 'V-002',
    ruleId: 'RULE-003',
    severity: 'error' as const,
    line: 16,
    text: '최소 6자 이상',
    message: '비밀번호는 최소 8자 이상, 영문/숫자/특수문자 조합이어야 합니다',
    clauseRef: 'POL-003',
  },
  {
    id: 'V-003',
    ruleId: 'RULE-003',
    severity: 'error' as const,
    line: 17,
    text: '영문 또는 숫자 조합',
    message: '비밀번호는 최소 8자 이상, 영문/숫자/특수문자 조합이어야 합니다',
    clauseRef: 'POL-003',
  },
  {
    id: 'V-004',
    ruleId: 'RULE-002',
    severity: 'error' as const,
    line: 20,
    text: 'AES-128 알고리즘으로',
    message: '개인정보 암호화는 AES-256 이상의 알고리즘을 사용해야 합니다',
    clauseRef: 'POL-002',
  },
  {
    id: 'V-005',
    ruleId: 'RULE-001',
    severity: 'error' as const,
    line: 0,
    text: '문서 전체',
    message: '개인정보 보호책임자(CPO) 연락처를 공개해야 합니다',
    clauseRef: 'POL-001',
  },
  {
    id: 'W-001',
    ruleId: 'RULE-005',
    severity: 'warn' as const,
    line: 11,
    text: '필수항목: 이름, 이메일, 전화번호',
    message: '수집 항목이 과도할 수 있습니다. 최소한의 정보만 수집하는 것을 권장합니다',
    clauseRef: 'POL-007',
  },
];

export function InspectionScreen({ onNext, onBack }: InspectionScreenProps) {
  const [selectedDoc, setSelectedDoc] = useState(sampleDocuments[0]);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  const { state, setState } = usePolint();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!state.rulesetId) {
      setError('Ruleset ID가 없습니다. 먼저 3단계에서 룰 컴파일(테스트 생성)을 진행하세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const lintResp = await lint(state.rulesetId, [
        {
          title: selectedDoc.name,
          content: documentContent,
        },
      ]);
      const run = await getRun(lintResp.runId);
      setState((s) => ({ ...s, lastRun: run }));
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warnCount = violations.filter(v => v.severity === 'warn').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const renderDocumentWithHighlights = () => {
    const lines = documentContent.split('\n');
    const violationLines = new Set(violations.map(v => v.line));

    return lines.map((line, index) => {
      const hasViolation = violationLines.has(index);
      const isHighlighted = highlightedLine === index;

      return (
        <div
          key={index}
          className={`px-4 py-1 ${
            hasViolation ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''
          } ${isHighlighted ? 'ring-2 ring-teal-500' : ''}`}
        >
          <span className="text-slate-400 text-xs mr-4 select-none">{index + 1}</span>
          <span className="text-sm text-slate-900">{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="h-full bg-slate-50 flex">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">문서 검사</h2>
          <p className="text-slate-600 mt-1">샘플 문서에 룰셋을 적용하여 위반사항을 검출합니다</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-all cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 font-medium">추가 문서 업로드</p>
                <p className="text-sm text-slate-500">PDF, DOCX, TXT 지원</p>
              </div>
            </div>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">검사 대상 문서 ({sampleDocuments.length})</h3>
          </div>

          <div className="divide-y divide-slate-200">
            {sampleDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  selectedDoc.id === doc.id ? 'bg-teal-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-500">{doc.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {doc.violations > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium border border-red-200">
                        {doc.violations} errors
                      </span>
                    )}
                    {doc.warnings > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium border border-yellow-200">
                        {doc.warnings} warnings
                      </span>
                    )}
                  </div>
                  {getStatusIcon(doc.status)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Preview */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">문서 미리보기</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                {errorCount} Errors
              </span>
              <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium border border-yellow-200">
                {warnCount} Warnings
              </span>
            </div>
          </div>

          <div className="bg-slate-900 p-6 max-h-96 overflow-auto">
            <div className="font-mono text-sm leading-relaxed">
              {renderDocumentWithHighlights()}
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
          <button 
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '검사 중...' : '결과 보기'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            오류: {error}
          </div>
        ) : null}
      </div>

      {/* Violations Panel */}
      <div className="w-96 bg-white border-l border-slate-200 p-6 overflow-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            위반 사항
          </h3>
          <p className="text-sm text-slate-600 mt-1">{selectedDoc.name}</p>
        </div>

        <div className="space-y-3">
          {violations.map((violation) => (
            <div
              key={violation.id}
              onMouseEnter={() => setHighlightedLine(violation.line)}
              onMouseLeave={() => setHighlightedLine(null)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                violation.severity === 'error'
                  ? 'border-red-200 bg-red-50 hover:border-red-300'
                  : 'border-yellow-200 bg-yellow-50 hover:border-yellow-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  violation.severity === 'error'
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                }`}>
                  {violation.severity.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-slate-500">Line {violation.line}</span>
              </div>

              <p className="text-sm font-medium text-slate-900 mb-2">{violation.message}</p>

              <div className="bg-white rounded border border-slate-200 p-2 mb-2">
                <code className="text-xs text-slate-700">{violation.text}</code>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {violation.ruleId}
                </span>
                <span className="text-slate-500">→</span>
                <span className="font-mono text-slate-600">{violation.clauseRef}</span>
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            오류: {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
