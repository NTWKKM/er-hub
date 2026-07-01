import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PeOrder from '../PeOrder';

describe('PeOrder', () => {
  it('renders the PE order form header', () => {
    render(<PeOrder />);
    expect(screen.getByText(/Massive PE Fibrinolysis/i)).toBeInTheDocument();
  });

  it('renders HN input field', () => {
    render(<PeOrder />);
    expect(screen.getByPlaceholderText(/กรอก HN/i)).toBeInTheDocument();
  });

  it('renders PE risk type radio buttons', () => {
    render(<PeOrder />);
    // At least 2 radio buttons for risk type
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThanOrEqual(4); // risk type + regimen radios
  });

  it('renders absolute contraindication checkboxes', () => {
    render(<PeOrder />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(6); // abs CI + rel CI + prior SK
  });

  it('renders calculate button', () => {
    render(<PeOrder />);
    expect(screen.getByRole('button', { name: /คำนวณ|สร้างใบสั่งยา|ตรวจสอบ/i })).toBeInTheDocument();
  });

  it('renders clear button', () => {
    render(<PeOrder />);
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeInTheDocument();
  });

  it('renders PDF print button', () => {
    render(<PeOrder />);
    expect(screen.getByRole('button', { name: /PDF|พิมพ์/i })).toBeInTheDocument();
  });

  it('blocks when absolute contraindication is checked', () => {
    render(<PeOrder />);
    // Check the first absolute CI checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // First abs CI
    // Click calculate
    const calcButton = screen.getByRole('button', { name: /คำนวณ|สร้างใบสั่งยา|ตรวจสอบ/i });
    fireEvent.click(calcButton);
    // Should show warning about absolute contraindication
    expect(screen.getByText(/ข้อห้ามเด็ดขาด|Exclusion Criteria/i)).toBeInTheDocument();
  });

  it('clears form when clear button is clicked', () => {
    render(<PeOrder />);
    const hnInput = screen.getByPlaceholderText(/กรอก HN/i);
    fireEvent.change(hnInput, { target: { value: '12345' } });
    const calcButton = screen.getByRole('button', { name: /คำนวณ|สร้างใบสั่งยา|ตรวจสอบ/i });
    fireEvent.click(calcButton);
    const clearButton = screen.getByRole('button', { name: /ล้าง/i });
    fireEvent.click(clearButton);
    expect(hnInput).toHaveValue('');
  });
});