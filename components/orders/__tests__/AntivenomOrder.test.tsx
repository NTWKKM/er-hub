import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AntivenomOrder from '../AntivenomOrder';

describe('AntivenomOrder', () => {
  it('renders the form header', () => {
    render(<AntivenomOrder />);
    expect(screen.getByText(/Standing Order for Antivenom/i)).toBeInTheDocument();
  });

  it('renders HN input', () => {
    render(<AntivenomOrder />);
    expect(screen.getByPlaceholderText(/กรอก HN/i)).toBeInTheDocument();
  });

  it('renders snake type radio buttons', () => {
    render(<AntivenomOrder />);
    expect(screen.getByText(/Hematotoxin/i)).toBeInTheDocument();
    expect(screen.getByText(/Neurotoxin/i)).toBeInTheDocument();
  });

  it('renders tetanus status select', () => {
    render(<AntivenomOrder />);
    expect(screen.getByText(/ประวัติวัคซีนบาดทะยัก/i)).toBeInTheDocument();
  });

  it('renders horse allergy radio buttons', () => {
    render(<AntivenomOrder />);
    expect(screen.getAllByText(/ไม่มีประวัติแพ้/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/มีประวัติแพ้/i).length).toBeGreaterThan(0);
  });

  it('renders penicillin allergy radio buttons', () => {
    render(<AntivenomOrder />);
    expect(screen.getByText(/Penicillin/i)).toBeInTheDocument();
  });

  it('renders calculate button', () => {
    render(<AntivenomOrder />);
    expect(screen.getByRole('button', { name: /ตรวจสอบและสร้างใบสั่งเซรุ่ม/i })).toBeInTheDocument();
  });

  it('renders PDF button', () => {
    render(<AntivenomOrder />);
    expect(screen.getByRole('button', { name: /PDF/i })).toBeInTheDocument();
  });

  it('renders clear button', () => {
    render(<AntivenomOrder />);
    expect(screen.getByRole('button', { name: /ล้างข้อมูล/i })).toBeInTheDocument();
  });

  it('shows warning when no indication is checked', () => {
    render(<AntivenomOrder />);
    const submitBtn = screen.getByRole('button', { name: /ตรวจสอบและสร้างใบสั่งเซรุ่ม/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/กรุณาเลือกข้อบ่งใช้/i)).toBeInTheDocument();
  });

  it('generates order when indication is checked', () => {
    render(<AntivenomOrder />);
    // Check first indication
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    // Submit
    const submitBtn = screen.getByRole('button', { name: /ตรวจสอบและสร้างใบสั่งเซรุ่ม/i });
    fireEvent.click(submitBtn);
    // Should show antivenom result
    expect(screen.getAllByText(/Antivenom/i).length).toBeGreaterThan(0);
  });

  it('clears form when clear button is clicked', () => {
    render(<AntivenomOrder />);
    // Check indication and submit
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const submitBtn = screen.getByRole('button', { name: /ตรวจสอบและสร้างใบสั่งเซรุ่ม/i });
    fireEvent.click(submitBtn);
    expect(screen.getAllByText(/Antivenom/i).length).toBeGreaterThan(0);
    // Clear
    const clearBtn = screen.getByRole('button', { name: /ล้างข้อมูล/i });
    fireEvent.click(clearBtn);
    // Warning should be cleared
    expect(screen.queryByText(/กรุณาเลือกข้อบ่งใช้/i)).not.toBeInTheDocument();
  });
});