import { Upload, FileText, ChevronDown, Eye } from 'lucide-react';
import { useState } from 'react';
import { createPolicy } from '../../lib/polintApi';
import { usePolint } from '../../lib/polintStore';

interface UploadScreenProps {
  onNext: () => void;
}

const demoRegulations = [
  { id: 1, name: '개인정보 보호법 시행령', pages: 42, lang: 'KR' },
  { id: 2, name: 'ISO 27001 보안정책 가이드라인', pages: 87, lang: 'EN' },
  { id: 3, name: '내부 문서 작성 규정 v2.3', pages: 15, lang: 'KR' },
];

export function UploadScreen({ onNext }: UploadScreenProps) {
  const [selectedDemo, setSelectedDemo] = useState(demoRegulations[0]);
  const { state, setState } = usePolint();
  const [regulationText, setRegulationText] = useState(state.regulationText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      // reset downstream state when starting over
      // 기존 reset
      setState((s) => ({
        ...s,
        regulationText,
        policyId: undefined,
        rulesetId: undefined,
        lastRun: undefined,

        // ✅ 추가
        normalizedPolicy: undefined,
        knowledgeDocs: [],
        hitlAnswers: {},
      }));
      const resp = await createPolicy(regulationText);
      setState((s) => ({ ...s, regulationText, policyId: resp.policyId }));
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">규정 문서 업로드</h2>
          <p className="text-slate-600 mt-1">분석할 정책 문서를 업로드하거나 데모용 규정을 선택하세요</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Upload Area */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <h3 className="text-lg font-medium text-slate-900 mb-4">문서 업로드</h3>
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-all cursor-pointer">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-900 font-medium mb-1">파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-sm text-slate-500">PDF, DOCX, TXT 또는 URL 지원</p>
                </div>
                <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium">
                  파일 선택
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-sm text-slate-600 font-medium">지원 형식</div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">PDF</span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">DOCX</span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">TXT</span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">Markdown</span>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">웹 URL</span>
              </div>
            </div>
          </div>

          {/* Demo Selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <h3 className="text-lg font-medium text-slate-900 mb-4">데모용 규정 선택</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">규정 문서</label>
              <div className="relative">
                <select 
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900"
                  value={selectedDemo.id}
                  onChange={(e) => {
                    const demo = demoRegulations.find(d => d.id === Number(e.target.value));
                    if (demo) setSelectedDemo(demo);
                  }}
                >
                  {demoRegulations.map(reg => (
                    <option key={reg.id} value={reg.id}>{reg.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start gap-3 mb-3">
                <FileText className="w-5 h-5 text-teal-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 mb-1">{selectedDemo.name}</h4>
                  <div className="flex gap-3 text-xs text-slate-600">
                    <span>{selectedDemo.pages}페이지</span>
                    <span>•</span>
                    <span>언어: {selectedDemo.lang}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-medium text-slate-600">미리보기</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  제1조 (목적) 본 규정은 개인정보 보호법에 따라 개인정보의 안전한 처리와 관리를 위한 기술적·관리적 보호조치에 관한 사항을 정함을 목적으로 한다.
                  <br /><br />
                  제2조 (적용범위) 본 규정은 회사가 처리하는 모든 개인정보에 적용되며, 임직원 및 협력사 직원은 본 규정을 준수하여야 한다.
                  <br /><br />
                  제3조 (책임자 지정) 회사는 개인정보 보호책임자(CPO)를 지정하고...
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">규정 텍스트 (편집 가능)</label>
                <textarea
                  value={regulationText}
                  onChange={(e) => setRegulationText(e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="여기에 규정 텍스트를 붙여넣으세요"
                />
                {state.policyId ? (
                  <p className="mt-2 text-xs text-slate-500">현재 Policy ID: <span className="font-mono">{state.policyId}</span></p>
                ) : null}
                {error ? (
                  <p className="mt-2 text-xs text-red-600">오류: {error}</p>
                ) : null}
              </div>
            </div>

            <button 
              onClick={handleStart}
              disabled={loading}
              className="w-full mt-6 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '업로드 중...' : '추출 시작'}
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-teal-600 mb-1">AI 기반</div>
            <p className="text-sm text-slate-600">자동 조항 추출 및 분류</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-teal-600 mb-1">다국어 지원</div>
            <p className="text-sm text-slate-600">한국어, 영어 등 주요 언어</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-teal-600 mb-1">실시간 검증</div>
            <p className="text-sm text-slate-600">추출 결과 즉시 확인</p>
          </div>
        </div>
      </div>
    </div>
  );
}
