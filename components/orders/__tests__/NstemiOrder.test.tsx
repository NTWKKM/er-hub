import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NstemiOrder from '../NstemiOrder';

describe('NstemiOrder', () => {
  it('renders the form header', () => {
    render(<NstemiOrder />);
    expect(screen.getByText(/NSTEMI Standing Order/i)).toBeInTheDocument();
  });

  it('renders patient info form with HN input', () => {
    render(<NstemiOrder />);
    expect(screen.getByPlaceholderText(/กรอก HN/i)).toBeInTheDocument();
  });

  it('renders eGFR input', () => {
    render(<NstemiOrder />);
    expect(screen.getByPlaceholderText(/กรอก eGFR/i)).toBeInTheDocument();
  });

  it('renders calculate button', () => {
    render(<NstemiOrder />);
    expect(screen.getByRole('button', { name: /คำนวณ/i })).toBeInTheDocument();
  });

  it('renders clear button', () => {
    render(<NstemiOrder />);
    expect(screen.getByRole('button', { name: /ล้าง/i })).toBeInTheDocument();
  });

  it('renders blank order button', () => {
    render(<NstemiOrder />);
    expect(screen.getByRole('button', { name: /ใบสั่งยาเปล่า/i })).toBeInTheDocument();
  });

  it('calculates and shows anticoagulant recommendation with valid eGFR', () => {
    render(<NstemiOrder />);
    const egfrInput = screen.getByPlaceholderText(/กรอก eGFR/i);
    fireEvent.change(egfrInput, { target: { value: '75' } });
    const calcButton = screen.getByRole('button', { name: /คำนวณ/i });
    fireEvent.click(calcButton);
    // Default weight=70, age=60, eGFR=75 → fondaparinux (renders in multiple places)
    expect(screen.getAllByText(/Fondaparinux/i).length).toBeGreaterThan(0);
  });

  it('shows heparin recommendation for eGFR < 15', () => {
    render(<NstemiOrder />);
    const egfrInput = screen.getByPlaceholderText(/กรอก eGFR/i);
    fireEvent.change(egfrInput, { target: { value: '10' } });
    const calcButton = screen.getByRole('button', { name: /คำนวณ/i });
    fireEvent.click(calcButton);
    expect(screen.getAllByText(/Heparin Bolus/i).length).toBeGreaterThan(0);
  });

  it('shows enoxaparin recommendation for eGFR 15-19', () => {
    render(<NstemiOrder />);
    const egfrInput = screen.getByPlaceholderText(/กรอก eGFR/i);
    fireEvent.change(egfrInput, { target: { value: '18' } });
    const calcButton = screen.getByRole('button', { name: /คำนวณ/i });
    fireEvent.click(calcButton);
    expect(screen.getAllByText(/Enoxaparin/i).length).toBeGreaterThan(0);
  });

  it('clears form when clear button is clicked', () => {
    render(<NstemiOrder />);
    const egfrInput = screen.getByPlaceholderText(/กรอก eGFR/i);
    fireEvent.change(egfrInput, { target: { value: '75' } });
    const calcButton = screen.getByRole('button', { name: /คำนวณ/i });
    fireEvent.click(calcButton);
    expect(screen.getAllByText(/Fondaparinux/i).length).toBeGreaterThan(0);
    const clearButton = screen.getByRole('button', { name: /ล้าง/i });
    fireEvent.click(clearButton);
    expect(screen.queryByText(/Fondaparinux/i)).not.toBeInTheDocument();
  });
});