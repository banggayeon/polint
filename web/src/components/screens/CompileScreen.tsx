import { ChevronLeft, ChevronRight, Save, Code2, FileJson } from 'lucide-react';
import { useState } from 'react';
import { buildPolicy } from '../../lib/polintApi';
import { usePolint } from '../../lib/polintStore';

interface CompileScreenProps {
  onNext: () => void;
  onBack: () => void;
}

const ruleCards = [
  {
    id: 'RULE-001',
    clauseRef: 'POL-001',
    severity: 'error',
    title: 'CPO 연락처 공개 필수',
    description: '개인정보 보호책임자 정보가 문서에 명시되어야 함',
    condition: 'privacy_officer_contact_exists == false',
  },
  {
    id: 'RULE-002',
    clauseRef: 'POL-002',
    severity: 'error',
    title: 'AES-256 암호화 알고리즘 검증',
    description: '개인정보 암호화 시 AES-256 이상 사용 확인',
    condition: 'encryption_algorithm != "AES-256"',
  },
  {
    id: 'RULE-003',
    clauseRef: 'POL-003',
    severity: 'error',
    title: '비밀번호 복잡도 검증',
    description: '최소 8자, 영문/숫자/특수문자 조합 검사',
    condition: 'regex: ^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$',
  },
  {
    id: 'RULE-004',
    clauseRef: 'POL-004',
    severity: 'error',
    title: '고유식별정보 수집 금지',
    description: '주민등록번호, 여권번호 등 금지어 검출',
    condition: 'contains("주민등록번호", "여권번호", "운전면허번호")',
  },
  {
    id: 'RULE-005',
    clauseRef: 'POL-007',
    severity: 'warn',
    title: '최소 권한 원칙 권장',
    description: '과도한 권한 부여 여부 확인',
    condition: 'permission_scope > minimum_required',
  },
];

const yamlOutput = `# Polint Policy Ruleset
# Generated from: 개인정보 보호법 시행령
# Version: 1.0.0

metadata:
  name: personal_data_protection
  version: 1.0.0
  source: 개인정보 보호법 시행령
  generated_at: 2026-02-03T10:30:00Z

rules:
  - id: RULE-001
    clause_ref: POL-001
    severity: error
    title: CPO 연락처 공개 필수
    description: 개인정보 보호책임자 정보가 문서에 명시되어야 함
    target: 전체 조직
    conditions:
      - privacy_officer_contact_exists == false
    message: "개인정보 보호책임자(CPO) 연락처를 공개해야 합니다"

  - id: RULE-002
    clause_ref: POL-002
    severity: error
    title: AES-256 암호화 알고리즘 검증
    description: 개인정보 암호화 시 AES-256 이상 사용 확인
    target: 기술팀
    conditions:
      - encryption_algorithm != "AES-256"
      - encryption_algorithm != "AES-512"
    message: "개인정보 암호화는 AES-256 이상의 알고리즘을 사용해야 합니다"

  - id: RULE-003
    clause_ref: POL-003
    severity: error
    title: 비밀번호 복잡도 검증
    description: 최소 8자, 영문/숫자/특수문자 조합 검사
    target: 전체 사용자
    conditions:
      - type: regex
        pattern: "^(?=.*[A-Za-z])(?=.*\\\\d)(?=.*[@$!%*#?&])[A-Za-z\\\\d@$!%*#?&]{8,}$"
        negate: true
    message: "비밀번호는 최소 8자 이상, 영문/숫자/특수문자 조합이어야 합니다"

  - id: RULE-004
    clause_ref: POL-004
    severity: error
    title: 고유식별정보 수집 금지
    description: 주민등록번호, 여권번호 등 금지어 검출
    target: 전체 조직
    conditions:
      - type: contains_any
        values:
          - "주민등록번호"
          - "여권번호"
          - "운전면허번호"
    message: "고유식별정보(주민등록번호, 여권번호 등)는 수집이 금지됩니다"

  - id: RULE-005
    clause_ref: POL-007
    severity: warn
    title: 최소 권한 원칙 권장
    description: 과도한 권한 부여 여부 확인
    target: 보안팀
    conditions:
      - permission_scope > minimum_required
    message: "접근 권한은 최소한의 범위로 부여하는 것을 권장합니다"
`;

export function CompileScreen({ onNext, onBack }: CompileScreenProps) {
  const [activeTab, setActiveTab] = useState<'yaml' | 'json'>('yaml');
  const { state, setState } = usePolint();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuild = async () => {
    if (!state.policyId) {
      setError('먼저 1단계에서 규정을 업로드해 Policy ID를 생성하세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await buildPolicy(state.policyId, state.knowledgeDocs ?? []);
      setState((s) => ({ ...s, rulesetId: resp.rulesetId }));
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'error' 
      ? 'bg-red-100 text-red-700 border-red-200' 
      : 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">룰 컴파일</h2>
          <p className="text-slate-600 mt-1">추출된 조항을 실행 가능한 룰로 변환합니다</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Policy Schema Form */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">정책 메타데이터</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">룰셋 이름</label>
                  <input 
                    type="text" 
                    defaultValue="personal_data_protection"
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
                    defaultValue="개인정보 보호법 시행령"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">생성된 룰 ({ruleCards.length})</h3>
              
              <div className="space-y-3">
                {ruleCards.map((rule) => (
                  <div key={rule.id} className="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {rule.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                          {rule.severity.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">→ {rule.clauseRef}</span>
                    </div>
                    <h4 className="font-medium text-slate-900 text-sm mb-1">{rule.title}</h4>
                    <p className="text-xs text-slate-600 mb-2">{rule.description}</p>
                    <div className="bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
                      <code className="text-xs text-slate-700 font-mono">{rule.condition}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Generated Code */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
            <div className="border-b border-slate-200 p-4 flex items-center justify-between bg-slate-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('yaml')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'yaml'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    YAML
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'json'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    JSON
                  </div>
                </button>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm">
                <Save className="w-4 h-4" />
                복사
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-900">
              <pre className="text-sm text-slate-100 font-mono leading-relaxed">
                <code>{yamlOutput}</code>
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
            <button 
              onClick={handleBuild}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '컴파일 중...' : '테스트 생성'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
