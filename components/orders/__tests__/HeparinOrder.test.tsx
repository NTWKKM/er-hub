import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeparinOrder from '../HeparinOrder';

describe('HeparinOrder', () => {
  it('renders heparin form header', () => {
    render(<HeparinOrder />);
    expect(screen.getByText(/Heparin Standing Order Generator/i)).toBeInTheDocument();
  });

  it('renders patient info section', () => {
    render(<HeparinOrder />);
    expect(screen.getByText(/ข้อมูลผู้ป่วย/i)).toBeInTheDocument();
  });

  it('renders weight slider', () => {
    render(<HeparinOrder />);
    expect(screen.getByText(/น้ำหนัก/i)).toBeInTheDocument();
  });

  it('renders protocol selector with 4 options', () => {
    render(<HeparinOrder />);
    expect(screen.getByText(/เลือกข้อบ่งชี้/i)).toBeInTheDocument();
    const select = document.getElementById('protocol-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(4);
  });

  it('renders concentration selector', () => {
    render(<HeparinOrder />);
    expect(screen.getByText(/ความเข้มข้น/i)).toBeInTheDocument();
  });

  it('renders bleeding risk factors section', () => {
    render(<HeparinOrder />);
    expect(screen.getByText(/คัดกรองปัจจัยเสี่ยงภาวะเลือดออก/i)).toBeInTheDocument();
  });

  it('has calculate button', () => {
    render(<HeparinOrder />);
    expect(screen.getByRole('button', { name: /ตรวจสอบและสร้างใบสั่งยาเริ่มต้น/i })).toBeInTheDocument();
  });

  it('has PDF button', () => {
    render(<HeparinOrder />);
    expect(screen.getByRole('button', { name: /ใบสั่งยาเปล่า/i })).toBeInTheDocument();
  });

  it('has clear button', () => {
    render(<HeparinOrder />);
    expect(screen.getByRole('button', { name: /ล้างข้อมูล/i })).toBeInTheDocument();
  });

  it('has HN input', () => {
    render(<HeparinOrder />);
    expect(screen.getByPlaceholderText(/กรอก HN/i)).toBeInTheDocument();
  });

  it('renders titration assistant section', () => {
    render(<HeparinOrder />);
    expect(screen.getByText(/เครื่องมือช่วย titration/i)).toBeInTheDocument();
  });
});
