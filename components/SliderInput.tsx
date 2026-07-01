'use client';

interface SliderInputProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
}

export default function SliderInput({ label, min, max, step, value, onChange, unit }: SliderInputProps) {
  const sliderId = label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return (
    <div className="slider-group">
      <label htmlFor={sliderId}>
        <span>{label}</span>
        <span className="slider-value">{value}{unit ? ` ${unit}` : ''}</span>
      </label>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}