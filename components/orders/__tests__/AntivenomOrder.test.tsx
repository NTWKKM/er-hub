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

  it('generates order showing snake-specific antivenom when indication is checked', () => {
    render(<AntivenomOrder />);
    // Check first indication
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    // Submit
    const submitBtn = screen.getByRole('button', { name: /ตรวจสอบและสร้างใบสั่งเซรุ่ม/i });
    fireEvent.click(submitBtn);
    // Should show the selected snake's screenLabel (Green pit viper default) — appears in dropdown + results
    expect(screen.getAllByText(/งูเขียวหางไหม้/i).length).toBeGreaterThan(0);
    // Should show antivenom administration section
    expect(screen.getByText(/Antivenom Administration/i)).toBeInTheDocument();
  });

  it('clears form and hides results when clear button is clicked', () => {
    render(<AntivenomOrder />);
    // Check indication and submit
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const submitBtn = screen.getByRole('button', { name: /ตรวจสอบและสร้างใบสั่งเซรุ่ม/i });
    fireEvent.click(submitBtn);
    // Verify results shown
    expect(screen.getByText(/Antivenom Administration/i)).toBeInTheDocument();
    // Clear
    const clearBtn = screen.getByRole('button', { name: /ล้างข้อมูล/i });
    fireEvent.click(clearBtn);
    // Results should be gone
    expect(screen.queryByText(/Antivenom Administration/i)).not.toBeInTheDocument();
    // Warning should be cleared
    expect(screen.queryByText(/กรุณาเลือกข้อบ่งใช้/i)).not.toBeInTheDocument();
  });
});