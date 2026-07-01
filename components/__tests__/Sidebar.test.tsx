import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/orders/rtpa',
}));

describe('Sidebar', () => {
  it('renders all 8 nav items', () => {
    render(<Sidebar />);
    expect(screen.getByText('rt-PA Stroke FAST TRACK')).toBeInTheDocument();
    expect(screen.getByText('STEMI Standing Order')).toBeInTheDocument();
    expect(screen.getByText('NSTEMI Standing Order')).toBeInTheDocument();
    expect(screen.getByText('Massive PE Fibrinolysis')).toBeInTheDocument();
    expect(screen.getByText('Heparin Protocol')).toBeInTheDocument();
    expect(screen.getByText('Antivenom Standing Order')).toBeInTheDocument();
    expect(screen.getByText('Post-Intubation Sedation')).toBeInTheDocument();
    expect(screen.getByText('IV Infusion Drip Calculator')).toBeInTheDocument();
  });

  it('marks active item based on pathname', () => {
    render(<Sidebar />);
    const activeLink = screen.getByText('rt-PA Stroke FAST TRACK').closest('a');
    expect(activeLink).toHaveClass('active');
  });
});