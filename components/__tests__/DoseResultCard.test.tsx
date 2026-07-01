import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DoseResultCard from '../DoseResultCard';

describe('DoseResultCard', () => {
  it('renders value + unit + label', () => {
    render(<DoseResultCard label="Drip Rate" value={4.2} unit="mL/hr" />);
    expect(screen.getByText('Drip Rate')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('mL/hr')).toBeInTheDocument();
  });

  it('renders context and ceiling', () => {
    render(<DoseResultCard label="Bolus" value={4000} unit="units" context="60 u/kg × 70 kg" ceiling="Max: 4000 units" />);
    expect(screen.getByText('60 u/kg × 70 kg')).toBeInTheDocument();
    expect(screen.getByText('Max: 4000 units')).toBeInTheDocument();
  });
});