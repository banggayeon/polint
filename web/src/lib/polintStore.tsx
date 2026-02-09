import React, { createContext, useContext, useMemo, useState } from "react";
import type {
  GetRunResponse,
  DocDto,
  NormalizedPolicy,
  RuleSet,
  TestSuite,
  VerificationReport,
} from "./polintApi";

export type InspectionDoc = {
  id: string;
  title: string;
  content: string;
};

export type PolintState = {
  regulationText: string;
  policyId?: string;

  // ✅ Step3(build) 결과 - demo 대신 실제 데이터 렌더링용
  ruleset?: RuleSet;
  testsuite?: TestSuite;
  verificationReport?: VerificationReport;

  // ✅ Step2 결과
  normalizedPolicy?: NormalizedPolicy;

  // ✅ HITL 답변을 Step3(build)에 컨텍스트로 넘기기 위한 docs
  knowledgeDocs: DocDto[];

  // ✅ open_questions에 대한 사용자 답변(프론트 보관용)
  hitlAnswers: Record<string, string>;

  rulesetId?: string;
  lastRun?: GetRunResponse;

  //step5. (문서 검사) 대상 문서들
  inspectionDocs: InspectionDoc[];
};

type PolintContextValue = {
  state: PolintState;
  setState: React.Dispatch<React.SetStateAction<PolintState>>;
};

const PolintContext = createContext<PolintContextValue | null>(null);

const DEFAULT_REG = `개인정보 보호 규정(샘플)

1. 개인정보 보호책임자(CPO)를 지정하고 그 연락처를 공개하여야 한다.
2. 개인정보의 암호화 저장 시 AES-256 이상의 알고리즘을 사용하여야 한다.
3. 비밀번호는 최소 8자 이상, 영문/숫자/특수문자 조합으로 구성되어야 한다.
4. "주민등록번호", "여권번호" 등 고유식별정보는 수집을 금지한다.
`;

export function PolintProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PolintState>({
    regulationText: DEFAULT_REG,
    knowledgeDocs: [],
    hitlAnswers: {},
    inspectionDocs: [],
  });

  const value = useMemo(() => ({ state, setState }), [state]);
  return <PolintContext.Provider value={value}>{children}</PolintContext.Provider>;
}

export function usePolint() {
  const ctx = useContext(PolintContext);
  if (!ctx) throw new Error("usePolint must be used within PolintProvider");
  return ctx;
}
