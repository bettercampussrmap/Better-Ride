import React from 'react';
import { Check } from 'lucide-react';

export type FlowStep = 1 | 2 | 3 | 4 | 5;

interface ProgressStepperProps {
  currentStep: FlowStep;
  onStepClick?: (step: FlowStep) => void;
}

const STEPS = [
  { step: 1 as FlowStep, label: 'Destination' },
  { step: 2 as FlowStep, label: 'Date' },
  { step: 3 as FlowStep, label: 'Time' },
  { step: 4 as FlowStep, label: 'Match' },
  { step: 5 as FlowStep, label: 'Join' },
];

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="w-full py-3 px-2">
      <div className="relative flex items-center justify-between">
        {/* Connecting horizontal line */}
        <div className="absolute left-4 right-4 top-3.5 h-[1.5px] bg-[#E4E4E7] -z-0" />

        {STEPS.map(({ step, label }) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isClickable = Boolean(onStepClick && step <= currentStep);

          return (
            <div
              key={step}
              className={`flex flex-col items-center z-10 ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={() => {
                if (isClickable && onStepClick) {
                  onStepClick(step);
                }
              }}
            >
              {/* Step indicator circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                  isCompleted
                    ? 'bg-[#09090B] text-white'
                    : isCurrent
                    ? 'bg-[#09090B] text-white ring-2 ring-[#09090B]/10'
                    : 'bg-white border border-[#E4E4E7] text-[#A1A1AA]'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <span>{step}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={`text-[10px] sm:text-[11px] mt-1.5 whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'font-bold text-[#09090B]'
                    : isCompleted
                    ? 'font-medium text-[#09090B]'
                    : 'font-medium text-[#A1A1AA]'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
