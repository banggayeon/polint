import { useState } from 'react';
import { Layout } from './components/Layout';
import { Stepper } from './components/Stepper';
import { UploadScreen } from './components/screens/UploadScreen';
import { ExtractionScreen } from './components/screens/ExtractionScreen';
import { CompileScreen } from './components/screens/CompileScreen';
import { TestScreen } from './components/screens/TestScreen';
import { InspectionScreen } from './components/screens/InspectionScreen';
import { ResultsScreen } from './components/screens/ResultsScreen';
import { PolintProvider } from './lib/polintStore';

const STEPS = [
  { id: 1, label: '규정 업로드' },
  { id: 2, label: '조항 추출/정규화' },
  { id: 3, label: '룰 컴파일' },
  { id: 4, label: '테스트 생성/검증' },
  { id: 5, label: '문서 검사' },
  { id: 6, label: '결과' },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 1:
        return <UploadScreen onNext={handleNext} />;
      case 2:
        return <ExtractionScreen onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <CompileScreen onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <TestScreen onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <InspectionScreen onNext={handleNext} onBack={handleBack} />;
      case 6:
        return <ResultsScreen onBack={handleBack} />;
      default:
        return <UploadScreen onNext={handleNext} />;
    }
  };

  return (
    <PolintProvider>
      <Layout currentStep={currentStep} onStepClick={handleStepClick}>
        <div className="h-full flex flex-col">
          <Stepper steps={STEPS} currentStep={currentStep} onStepClick={handleStepClick} />
          <div className="flex-1 overflow-auto">{renderScreen()}</div>
        </div>
      </Layout>
    </PolintProvider>
  );
}
