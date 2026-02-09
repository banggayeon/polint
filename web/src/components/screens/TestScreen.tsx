import { ChevronLeft, ChevronRight, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface TestScreenProps {
  onNext: () => void;
  onBack: () => void;
}

const generatedTests = [
  {
    id: 'TEST-001',
    ruleId: 'RULE-001',
    type: 'FAIL',
    name: 'CPO 정보 누락 감지',
    input: '본 문서는 개인정보 처리방침입니다. 수집 항목: 이름, 이메일...',
    expected: 'violation',
    actual: 'violation',
    status: 'pass',
  },
  {
    id: 'TEST-002',
    ruleId: 'RULE-001',
    type: 'PASS',
    name: 'CPO 정보 존재 확인',
    input: '개인정보 보호책임자: 홍길동 (privacy@company.com, 02-1234-5678)',
    expected: 'compliant',
    actual: 'compliant',
    status: 'pass',
  },
  {
    id: 'TEST-003',
    ruleId: 'RULE-003',
    type: 'FAIL',
    name: '약한 비밀번호 감지',
    input: '비밀번호: password123',
    expected: 'violation',
    actual: 'violation',
    status: 'pass',
  },
  {
    id: 'TEST-004',
    ruleId: 'RULE-003',
    type: 'PASS',
    name: '강한 비밀번호 허용',
    input: '비밀번호: P@ssw0rd!123',
    expected: 'compliant',
    actual: 'compliant',
    status: 'pass',
  },
  {
    id: 'TEST-005',
    ruleId: 'RULE-004',
    type: 'FAIL',
    name: '주민등록번호 감지',
    input: '본인확인을 위해 주민등록번호를 입력해주세요.',
    expected: 'violation',
    actual: 'violation',
    status: 'pass',
  },
  {
    id: 'TEST-006',
    ruleId: 'RULE-004',
    type: 'FAIL',
    name: '여권번호 감지',
    input: '여권번호: M12345678',
    expected: 'violation',
    actual: 'violation',
    status: 'pass',
  },
  {
    id: 'TEST-007',
    ruleId: 'RULE-002',
    type: 'FAIL',
    name: '약한 암호화 알고리즘',
    input: 'encryption: AES-128',
    expected: 'violation',
    actual: 'violation',
    status: 'pass',
  },
  {
    id: 'TEST-008',
    ruleId: 'RULE-002',
    type: 'PASS',
    name: '강한 암호화 알고리즘',
    input: 'encryption: AES-256',
    expected: 'compliant',
    actual: 'compliant',
    status: 'pass',
  },
];

export function TestScreen({ onNext, onBack }: TestScreenProps) {
  const [strictness, setStrictness] = useState(50);

  const passTests = generatedTests.filter(t => t.type === 'PASS');
  const failTests = generatedTests.filter(t => t.type === 'FAIL');
  const passCount = generatedTests.filter(t => t.status === 'pass').length;

  return (
    <div className="h-full bg-slate-50 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">테스트 생성 및 검증</h2>
          <p className="text-slate-600 mt-1">룰 정확도를 검증하기 위한 테스트가 자동 생성되었습니다</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-slate-900 mb-1">{generatedTests.length}</div>
            <p className="text-sm text-slate-600">총 테스트</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-green-600 mb-1">{passCount}</div>
            <p className="text-sm text-slate-600">통과</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-teal-600 mb-1">{passTests.length}</div>
            <p className="text-sm text-slate-600">PASS 예제</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-semibold text-red-600 mb-1">{failTests.length}</div>
            <p className="text-sm text-slate-600">FAIL 예제</p>
          </div>
        </div>

        {/* Strictness Adjustment */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                오탐/미탐 조정
              </h3>
              <p className="text-sm text-slate-600 mt-1">룰 엄격도를 조정하여 정확도를 최적화합니다</p>
            </div>
            <span className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium border border-teal-200">
              {strictness}%
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 whitespace-nowrap">관대함</span>
            <input
              type="range"
              min="0"
              max="100"
              value={strictness}
              onChange={(e) => setStrictness(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <span className="text-sm text-slate-600 whitespace-nowrap">엄격함</span>
          </div>

          <div className="mt-4 flex gap-4 text-xs text-slate-600">
            <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="font-medium text-slate-900">낮은 엄격도:</span> 오탐(False Positive) 감소, 미탐(False Negative) 증가
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="font-medium text-slate-900">높은 엄격도:</span> 미탐 감소, 오탐 증가
            </div>
          </div>
        </div>

        {/* Test Results Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">테스트 결과</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">테스트 ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">룰</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">입력 스니펫</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">예상</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">실제</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {generatedTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-slate-700">
                        {test.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded">
                        {test.ruleId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        test.type === 'PASS' 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {test.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700 max-w-xs truncate">{test.input}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        test.expected === 'violation' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {test.expected}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        test.actual === 'violation' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {test.actual}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {test.status === 'pass' ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">PASS</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">FAIL</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
              <Play className="w-4 h-4" />
              재실행
            </button>
            <button 
              onClick={onNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              문서 검사로 이동
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
