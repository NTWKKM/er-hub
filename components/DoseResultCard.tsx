interface DoseResultCardProps {
  label: string;
  value: number | string;
  unit: string;
  context?: string;
  ceiling?: string;
}

export default function DoseResultCard({ label, value, unit, context, ceiling }: DoseResultCardProps) {
  return (
    <div className="dose-result">
      <div className="dose-result-label">{label}</div>
      <div>
        <span className="dose-result-value">{value}</span>
        <span className="dose-result-unit">{unit}</span>
      </div>
      {context && <div className="dose-result-context">{context}</div>}
      {ceiling && <div className="dose-result-ceiling">{ceiling}</div>}
    </div>
  );
}