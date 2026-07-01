import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RtpaOrder from '../RtpaOrder';

describe('RtpaOrder', () => {
  it('renders rt-PA form header', () => {
    render(<RtpaOrder />);
    expect(screen.getByText(/rt-PA Stroke FAST TRACK/i)).toBeInTheDocument();
  });

  it('renders patient info section', () => {
    render(<RtpaOrder />);
    expect(screen.getByText(/ข้อมูลผู้ป่วย/i)).toBeInTheDocument();
  });

  it('renders weight slider', () => {
    render(<RtpaOrder />);
    expect(screen.getByText(/น้ำหนัก/i)).toBeInTheDocument();
  });

  it('renders dose regimen section', () => {
    render(<RtpaOrder />);
    expect(screen.getByText(/เลือกขนาดยา/i)).toBeInTheDocument();
  });

  it('has 0.9 mg/kg regimen selected by default', () => {
    render(<RtpaOrder />);
    const standardRadio = screen.getByLabelText('Standard Dose: 0.9 mg/kg (Max 90 mg)') as HTMLInputElement;
    expect(standardRadio.checked).toBe(true);
  });

  it('has calculate button', () => {
    render(<RtpaOrder />);
    expect(screen.getByRole('button', { name: /คำนวณและสร้างใบสั่งยา/i })).toBeInTheDocument();
  });

  it('has print buttons', () => {
    render(<RtpaOrder />);
    expect(screen.getByRole('button', { name: /ใบสั่งยาเปล่า/i })).toBeInTheDocument();
  });

  it('has clear button', () => {
    render(<RtpaOrder />);
    expect(screen.getByRole('button', { name: /ล้างข้อมูล/i })).toBeInTheDocument();
  });

  it('has HN input', () => {
    render(<RtpaOrder />);
    expect(screen.getByPlaceholderText(/กรอก HN/i)).toBeInTheDocument();
  });

  it('calculates default 0.9 mg/kg dose (70kg → 63mg total, 10% bolus + 90% infusion)', () => {
    render(<RtpaOrder />);
    // Enter HN to pass validation
    const hnInput = screen.getByPlaceholderText(/กรอก HN/i);
    fireEvent.change(hnInput, { target: { value: '12345' } });
    // Click calculate
    const calcBtn = screen.getByRole('button', { name: /คำนวณและสร้างใบสั่งยา/i });
    fireEvent.click(calcBtn);
    // Total dose = 70 * 0.9 = 63.00 mg
    expect(screen.getByText('63.00')).toBeInTheDocument();
    // Bolus = 63 * 0.10 = 6.3 mg
    expect(screen.getByText(/6\.3/)).toBeInTheDocument();
    // Infusion = 63 * 0.90 = 56.70 mg
    expect(screen.getByText('56.70')).toBeInTheDocument();
    // 10% and 90% labels
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('calculates capped dose at 90mg for heavy patient (0.9 mg/kg, weight > 100kg)', () => {
    render(<RtpaOrder />);
    const hnInput = screen.getByPlaceholderText(/กรอก HN/i);
    fireEvent.change(hnInput, { target: { value: '12345' } });
    // Set weight to 120 kg → 120 * 0.9 = 108, capped at 90
    const weightSlider = screen.getAllByRole('slider')[0];
    fireEvent.change(weightSlider, { target: { value: '120' } });
    const calcBtn = screen.getByRole('button', { name: /คำนวณและสร้างใบสั่งยา/i });
    fireEvent.click(calcBtn);
    // Total dose = 90.00 mg (capped)
    expect(screen.getByText('90.00')).toBeInTheDocument();
    // Bolus = 90 * 0.10 = 9.0 mg
    expect(screen.getByText(/9\.0/)).toBeInTheDocument();
  });

  it('calculates 0.6 mg/kg regimen dose (70kg → 42mg total)', () => {
    render(<RtpaOrder />);
    const hnInput = screen.getByPlaceholderText(/กรอก HN/i);
    fireEvent.change(hnInput, { target: { value: '12345' } });
    // Switch to 0.6 mg/kg
    const altRadio = screen.getByLabelText('Alternative Dose: 0.6 mg/kg (Max 50 mg)') as HTMLInputElement;
    fireEvent.click(altRadio);
    const calcBtn = screen.getByRole('button', { name: /คำนวณและสร้างใบสั่งยา/i });
    fireEvent.click(calcBtn);
    // Total dose = 70 * 0.6 = 42.00 mg
    expect(screen.getByText('42.00')).toBeInTheDocument();
    // Bolus = 42 * 0.10 = 4.2 mg
    expect(screen.getByText(/4\.2/)).toBeInTheDocument();
  });

  it('truncates bolus to 1 decimal (floor) and remainder goes to infusion (65kg → 58.50 total, bolus 5.8, infusion 52.70)', () => {
    render(<RtpaOrder />);
    const hnInput = screen.getByPlaceholderText(/กรอก HN/i);
    fireEvent.change(hnInput, { target: { value: '12345' } });
    // Set weight to 65 kg → 65 * 0.9 = 58.50
    const weightSlider = screen.getAllByRole('slider')[0];
    fireEvent.change(weightSlider, { target: { value: '65' } });
    const calcBtn = screen.getByRole('button', { name: /คำนวณและสร้างใบสั่งยา/i });
    fireEvent.click(calcBtn);
    // Total dose = 58.50 mg
    expect(screen.getByText('58.50')).toBeInTheDocument();
    // Bolus = 58.50 * 0.10 = 5.85 → truncated to 5.8 mg (floor, not round)
    expect(screen.getByText(/5\.8/)).toBeInTheDocument();
    // Infusion = 58.50 - 5.8 = 52.70 mg (remainder goes to infusion)
    expect(screen.getByText('52.70')).toBeInTheDocument();
  });
});