import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../form-validate';

describe('useFormValidation', () => {
  it('fail sets error for a field', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.fail('weight', 'กรุณากรอกน้ำหนัก');
    });
    expect(result.current.hasError('weight')).toBe(true);
    expect(result.current.getError('weight')).toBe('กรุณากรอกน้ำหนัก');
  });

  it('clear removes error for a field', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.fail('weight', 'error');
    });
    expect(result.current.hasError('weight')).toBe(true);
    act(() => {
      result.current.clear('weight');
    });
    expect(result.current.hasError('weight')).toBe(false);
  });

  it('range validates within bounds', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.range('age', 25, 18, 120, 'อายุไม่ถูกต้อง');
    });
    expect(result.current.hasError('age')).toBe(false);

    act(() => {
      result.current.range('age', 200, 18, 120, 'อายุเกิน 120');
    });
    expect(result.current.hasError('age')).toBe(true);
    expect(result.current.getError('age')).toBe('อายุเกิน 120');
  });

  it('range catches NaN', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.range('egfr', NaN, 0, 200, 'eGFR ไม่ใช่ตัวเลข');
    });
    expect(result.current.hasError('egfr')).toBe(true);
  });

  it('min validates minimum value', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.min('weight', 50, 30, 'น้ำหนักต่ำเกินไป');
    });
    expect(result.current.hasError('weight')).toBe(false);

    act(() => {
      result.current.min('weight', 10, 30, 'น้ำหนักต่ำเกินไป');
    });
    expect(result.current.hasError('weight')).toBe(true);
  });

  it('warn sets clinical warning', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.warn('ห้ามใช้ Streptokinase ในผู้ป่วยที่เคยได้รับแล้ว');
    });
    expect(result.current.warning).toBe('ห้ามใช้ Streptokinase ในผู้ป่วยที่เคยได้รับแล้ว');
  });

  it('clearWarn removes warning', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.warn('warning text');
    });
    expect(result.current.warning).not.toBeNull();
    act(() => {
      result.current.clearWarn();
    });
    expect(result.current.warning).toBeNull();
  });

  it('clearAll resets everything', () => {
    const { result } = renderHook(() => useFormValidation());
    act(() => {
      result.current.fail('field1', 'err1');
      result.current.fail('field2', 'err2');
      result.current.warn('warn1');
    });
    act(() => {
      result.current.clearAll();
    });
    expect(result.current.hasError('field1')).toBe(false);
    expect(result.current.hasError('field2')).toBe(false);
    expect(result.current.warning).toBeNull();
  });
});