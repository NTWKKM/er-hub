'use client';

import { useState, useCallback, useRef } from 'react';

export interface ValidationError {
  fieldId: string;
  message: string;
}

export interface FormValidationState {
  errors: Record<string, string>;
  warning: string | null;
  fail: (fieldId: string, message: string) => boolean;
  clear: (fieldId: string) => boolean;
  range: (fieldId: string, value: number, min: number, max: number, message: string) => boolean;
  min: (fieldId: string, value: number, minVal: number, message: string) => boolean;
  warn: (message: string) => boolean;
  clearWarn: () => void;
  clearAll: () => void;
  hasError: (fieldId: string) => boolean;
  getError: (fieldId: string) => string | undefined;
}

export function useFormValidation(): FormValidationState {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const fail = useCallback((fieldId: string, message: string): boolean => {
    setErrors(prev => ({ ...prev, [fieldId]: message }));
    const el = fieldRefs.current[fieldId];
    if (el) el.focus();
    return false;
  }, []);

  const clear = useCallback((fieldId: string): boolean => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    return true;
  }, []);

  const range = useCallback((fieldId: string, value: number, min: number, max: number, message: string): boolean => {
    if (isNaN(value) || value < min || value > max) {
      return fail(fieldId, message);
    }
    return clear(fieldId);
  }, [fail, clear]);

  const min = useCallback((fieldId: string, value: number, minVal: number, message: string): boolean => {
    if (isNaN(value) || value < minVal) {
      return fail(fieldId, message);
    }
    return clear(fieldId);
  }, [fail, clear]);

  const warn = useCallback((message: string): boolean => {
    setWarning(message);
    return false;
  }, []);

  const clearWarn = useCallback(() => {
    setWarning(null);
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
    setWarning(null);
  }, []);

  const hasError = useCallback((fieldId: string): boolean => {
    return !!errors[fieldId];
  }, [errors]);

  const getError = useCallback((fieldId: string): string | undefined => {
    return errors[fieldId];
  }, [errors]);

  return {
    errors,
    warning,
    fail,
    clear,
    range,
    min,
    warn,
    clearWarn,
    clearAll,
    hasError,
    getError,
  };
}