import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-6">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onStepClick(step.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                  step.id < currentStep
                    ? 'bg-teal-600 text-white'
                    : step.id === currentStep
                    ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </button>
              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium ${
                    step.id <= currentStep ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-xs text-slate-500">Step {step.id}</span>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                step.id < currentStep ? 'bg-teal-600' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
