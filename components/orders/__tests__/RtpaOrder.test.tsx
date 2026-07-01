import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
