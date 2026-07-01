import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SedationOrder from '../SedationOrder';

describe('SedationOrder', () => {
  it('renders the Post-Intubation Sedation header', () => {
    render(<SedationOrder />);
    expect(screen.getByText('🌬️ Post-Intubation Sedation Generator')).toBeInTheDocument();
    expect(screen.getByText(/Emergency Department/)).toBeInTheDocument();
  });

  it('renders weight slider with default value', () => {
    render(<SedationOrder />);
    // Check for the weight slider by finding the span with the label text
    expect(screen.getByText('น้ำหนัก (BW kg)')).toBeInTheDocument();
    expect(screen.getByText('70 kg')).toBeInTheDocument();
  });

  it('renders HN input field', () => {
    render(<SedationOrder />);
    const hnInput = screen.getByPlaceholderText('กรอก HN');
    expect(hnInput).toBeInTheDocument();
  });

  it('renders Fentanyl dose slider with correct range', () => {
    render(<SedationOrder />);
    expect(screen.getByText('Dose (mcg/kg/h)')).toBeInTheDocument();
    // Default value should be 1.0 mcg/kg/hr (displayed as "1 mcg/kg/hr")
    expect(screen.getByText('1 mcg/kg/hr')).toBeInTheDocument();
  });

  it('renders Midazolam dose slider with correct range', () => {
    render(<SedationOrder />);
    expect(screen.getByText('Dose (mg/kg/h)')).toBeInTheDocument();
    // Default value should be 0.05 mg/kg/hr
    expect(screen.getByText('0.05 mg/kg/hr')).toBeInTheDocument();
  });

  it('renders Fentanyl and Midazolam card headers', () => {
    render(<SedationOrder />);
    expect(screen.getByText('Fentanyl Drip')).toBeInTheDocument();
    expect(screen.getByText('Midazolam Drip')).toBeInTheDocument();
  });

  it('shows Fentanyl concentration info', () => {
    render(<SedationOrder />);
    expect(screen.getByText(/สูตรเจือจาง: Fentanyl 500 mcg \+ NSS 100 mL \(5 mcg\/mL\)/)).toBeInTheDocument();
  });

  it('shows Midazolam concentration info', () => {
    render(<SedationOrder />);
    expect(screen.getByText(/สูตรเจือจาง: Midazolam 100 mg \+ NSS 100 mL \(1 mg\/mL\)/)).toBeInTheDocument();
  });

  it('calculates drip rates when calculate button is clicked', () => {
    render(<SedationOrder />);
    
    // Click calculate button
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    // Should show results
    expect(screen.getByText(/Fentanyl Infusion Rate/)).toBeInTheDocument();
    expect(screen.getByText(/Midazolam Infusion Rate/)).toBeInTheDocument();
  });

  it('displays Fentanyl drip rate result after calculation', () => {
    render(<SedationOrder />);
    
    // Default: weight=70, fenDose=1.0, concentration=5
    // fenRate = (1.0 * 70) / 5 = 14.0 mL/hr
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    // The value appears in multiple places, use query that finds at least one
    expect(screen.getAllByText('14.0 mL/hr').length).toBeGreaterThan(0);
  });

  it('displays Midazolam drip rate result after calculation', () => {
    render(<SedationOrder />);
    
    // Default: weight=70, midDose=0.05, concentration=1
    // midRate = (0.05 * 70) / 1 = 3.5 mL/hr
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    expect(screen.getAllByText('3.5 mL/hr').length).toBeGreaterThan(0);
  });

  it('shows Fentanyl ceiling warning (Max: 500 mcg/hr)', () => {
    render(<SedationOrder />);
    
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    expect(screen.getByText('Max: 500 mcg/hr')).toBeInTheDocument();
  });

  it('shows safety warning when Fentanyl exceeds max dose', () => {
    render(<SedationOrder />);
    
    // Set weight to 100kg and dose to 6 mcg/kg/hr = 600 mcg/hr > 500 max
    // Find weight slider input by type and change it
    const weightSlider = screen.getAllByRole('slider')[0]; // First slider is weight
    fireEvent.change(weightSlider, { target: { value: '100' } });

    // Find Fentanyl dose slider (second slider) and change it
    const fenSlider = screen.getAllByRole('slider')[1];
    fireEvent.change(fenSlider, { target: { value: '6' } });

    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    expect(screen.getByText(/Safety Warning: Fentanyl total dose.*exceeds maximum/)).toBeInTheDocument();
  });

  it('clears form when clear button is clicked', () => {
    render(<SedationOrder />);
    
    // Fill in some data
    const hnInput = screen.getByPlaceholderText('กรอก HN');
    fireEvent.change(hnInput, { target: { value: '12345' } });

    // Click calculate first
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    // Click clear
    const clearButton = screen.getByText('ล้างข้อมูล (Clear)');
    fireEvent.click(clearButton);

    // HN should be cleared
    expect(hnInput).toHaveValue('');
  });

  it('has print blank PDF button', () => {
    render(<SedationOrder />);
    expect(screen.getByText('ใบสั่งยาเปล่า (PDF)')).toBeInTheDocument();
  });

  it('shows sedation plan after calculation', () => {
    render(<SedationOrder />);
    
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    expect(screen.getByText('Sedation Plan:')).toBeInTheDocument();
    expect(screen.getByText(/Fentanyl maintenance:/)).toBeInTheDocument();
    expect(screen.getByText(/Midazolam maintenance:/)).toBeInTheDocument();
  });

  it('shows Continuous Drip section after calculation', () => {
    render(<SedationOrder />);
    
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    expect(screen.getByText('Continuous Drip:')).toBeInTheDocument();
    expect(screen.getByText(/Fentanyl 500 mcg \+ NSS\/5%DW 100 mL/)).toBeInTheDocument();
    expect(screen.getByText(/Midazolam 100 mg \+ NSS\/5%DW 100 mL/)).toBeInTheDocument();
  });

  it('shows safety monitoring section after calculation', () => {
    render(<SedationOrder />);
    
    const calcButton = screen.getByText('คำนวณขนาดยาและสร้างใบสั่งยา');
    fireEvent.click(calcButton);

    expect(screen.getByText('Safety Monitoring:')).toBeInTheDocument();
    expect(screen.getByText(/Monitor respiratory rate and BP q 1 hr/)).toBeInTheDocument();
    expect(screen.getByText(/Keep sedation level \(RASS score -2 to 0\)/)).toBeInTheDocument();
  });
});