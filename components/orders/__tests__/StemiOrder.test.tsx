import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StemiOrder from '../StemiOrder';

describe('StemiOrder', () => {
  it('renders STEMI form header', () => {
    render(<StemiOrder />);
    expect(screen.getByText(/STEMI Standing Order Generator/i)).toBeInTheDocument();
  });

  it('renders patient info section', () => {
    render(<StemiOrder />);
    expect(screen.getByText('ข้อมูลผู้ป่วย')).toBeInTheDocument();
  });

  it('renders fibrinolytic choice section', () => {
    render(<StemiOrder />);
    expect(screen.getByText(/เลือกยาละลายลิ่มเลือด/i)).toBeInTheDocument();
  });

  it('has TNK selected by default', () => {
    render(<StemiOrder />);
    const tnkRadio = screen.getByDisplayValue('tnk') as HTMLInputElement;
    expect(tnkRadio.checked).toBe(true);
  });

  it('shows SK prior checkbox only when SK is selected', () => {
    render(<StemiOrder />);
    expect(screen.queryByText(/เคยได้รับ Streptokinase มาก่อน/i)).not.toBeInTheDocument();
    const skRadio = screen.getByDisplayValue('sk') as HTMLInputElement;
    fireEvent.click(skRadio);
    expect(screen.getByText(/เคยได้รับ Streptokinase มาก่อน/i)).toBeInTheDocument();
  });

  it('blocks SK order when prior SK is checked', () => {
    render(<StemiOrder />);
    const skRadio = screen.getByDisplayValue('sk') as HTMLInputElement;
    fireEvent.click(skRadio);
    const priorSKCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(priorSKCheckbox);
    const submitBtn = screen.getByRole('button', { name: /คำนวณขนาดยา/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/ห้ามให้ Streptokinase ซ้ำ/i)).toBeInTheDocument();
  });

  it('calculates TNK dose with default weight 70kg (40mg)', () => {
    render(<StemiOrder />);
    const submitBtn = screen.getByRole('button', { name: /คำนวณขนาดยา/i });
    fireEvent.click(submitBtn);
    // Default weight=70, age=60 → TNK 40mg (8ml)
    expect(screen.getByText(/TNK 40 mg/i)).toBeInTheDocument();
  });

  it('clear button resets state', () => {
    render(<StemiOrder />);
    const submitBtn = screen.getByRole('button', { name: /คำนวณขนาดยา/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/ตรวจสอบและพิมพ์ใบสั่งยา/i)).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: /ล้างข้อมูล/i });
    fireEvent.click(clearBtn);
    expect(screen.queryByText(/ตรวจสอบและพิมพ์ใบสั่งยา/i)).not.toBeInTheDocument();
  });

  it('has print PDF button', () => {
    render(<StemiOrder />);
    expect(screen.getByRole('button', { name: /พิมพ์ Order/i })).toBeInTheDocument();
  });
});