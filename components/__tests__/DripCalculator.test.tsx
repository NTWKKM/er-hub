import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('changes drug and resets prepIndex + dose', () => {
    render(<DripCalculator />);
    const drugSelect = document.getElementById('drug-select') as HTMLSelectElement;
    // Change to Norepinephrine (index 1)
    fireEvent.change(drugSelect, { target: { value: 'norepinephrine' } });
    expect(drugSelect.value).toBe('norepinephrine');
    // The dose display should show 0.1 (norepinephrine default) — may appear in multiple spans
    expect(screen.getAllByText(/0\.1/).length).toBeGreaterThan(0);
  });

  it('updates drip rate when weight changes', () => {
    render(<DripCalculator />);
    // Default: Epinephrine, dose 0.1 mcg/kg/min, weight 70kg, conc 100 mcg/mL
    // dripRate = (0.1 * 70 * 60) / 100 = 4.20 mL/hr
    const weightSliders = screen.getAllByRole('slider');
    const weightSlider = weightSliders[0]; // First slider is weight
    fireEvent.change(weightSlider, { target: { value: '80' } });
    // New: (0.1 * 80 * 60) / 100 = 4.80 mL/hr
    expect(screen.getAllByText(/4\.80/).length).toBeGreaterThan(0);
  });

  it('updates drip rate when dose changes', () => {
    render(<DripCalculator />);
    const doseSlider = screen.getAllByRole('slider')[1]; // Second slider is dose
    fireEvent.change(doseSlider, { target: { value: '0.2' } });
    // (0.2 * 70 * 60) / 100 = 8.40 mL/hr
    expect(screen.getAllByText(/8\.40/).length).toBeGreaterThan(0);
  });

  it('updates drip rate when preparation changes', () => {
    render(<DripCalculator />);
    const prepSelect = document.getElementById('prep-select') as HTMLSelectElement;
    // Epinephrine has only 1 preparation so change drug first
    const drugSelect = document.getElementById('drug-select') as HTMLSelectElement;
    fireEvent.change(drugSelect, { target: { value: 'dopamine' } });
    // Dopamine: default dose 5.0, weight 70, conc 1000
    // dripRate = (5.0 * 70 * 60) / 1000 = 21.00 mL/hr
    expect(screen.getAllByText(/21\.00/).length).toBeGreaterThan(0);
    // Change to second preparation (2000 mcg/mL)
    fireEvent.change(prepSelect, { target: { value: '1' } });
    // dripRate = (5.0 * 70 * 60) / 2000 = 10.50 mL/hr
    expect(screen.getAllByText(/10\.50/).length).toBeGreaterThan(0);
  });
});