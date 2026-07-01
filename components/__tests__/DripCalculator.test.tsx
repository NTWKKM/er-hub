import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DripCalculator from '../DripCalculator';

describe('DripCalculator', () => {
  it('renders drug selector with 12 drugs', () => {
    render(<DripCalculator />);
    expect(screen.getByText('IV Infusion Drip Calculator')).toBeInTheDocument();
    expect(screen.getByText(/Epinephrine/)).toBeInTheDocument();
  });

  it('shows drip rate result card', () => {
    render(<DripCalculator />);
    expect(screen.getByText('Drip Rate')).toBeInTheDocument();
    expect(screen.getByText('mL/hr')).toBeInTheDocument();
  });

  it('shows titration guide card', () => {
    render(<DripCalculator />);
    expect(screen.getByText('คำแนะนำการปรับยา')).toBeInTheDocument();
  });
});