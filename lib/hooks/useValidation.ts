import { useState, useEffect } from 'react';

interface ValidationRules {
  email: string;
  password: string;
  displayName: string;
}

interface ValidationErrors {
  email: string;
  password: string;
  displayName: string;
}

interface UseValidationReturn {
  errors: ValidationErrors;
  isValid: boolean;
  validate: (field: keyof ValidationRules, value: string) => void;
  validateAll: (values: ValidationRules) => boolean;
}

export function useValidation(): UseValidationReturn {
  const [errors, setErrors] = useState<ValidationErrors>({
    email: '',
    password: '',
    displayName: '',
  });

  const [isValid, setIsValid] = useState(false);

  // Email validation: empty check + email format
  const validateEmail = (email: string): string => {
    if (!email) {
      return 'メールアドレスを入力してください';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'メールアドレスの形式が正しくありません';
    }
    return '';
  };

  // Password validation: 8+ chars, uppercase, lowercase, number
  const validatePassword = (password: string): string => {
    if (!password) {
      return 'パスワードを入力してください';
    }
    if (password.length < 8) {
      return 'パスワードは8文字以上である必要があります';
    }
    if (!/[A-Z]/.test(password)) {
      return 'パスワードには英大文字を含める必要があります';
    }
    if (!/[a-z]/.test(password)) {
      return 'パスワードには英小文字を含める必要があります';
    }
    if (!/[0-9]/.test(password)) {
      return 'パスワードには数字を含める必要があります';
    }
    return '';
  };

  // DisplayName validation: 1-50 chars
  const validateDisplayName = (name: string): string => {
    if (!name) {
      return '名前を入力してください';
    }
    if (name.length < 1) {
      return '名前は1文字以上である必要があります';
    }
    if (name.length > 50) {
      return '名前は50文字以下である必要があります';
    }
    return '';
  };

  // Single field validation
  const validate = (field: keyof ValidationRules, value: string) => {
    let error = '';

    switch (field) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'displayName':
        error = validateDisplayName(value);
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  // Validate all fields
  const validateAll = (values: ValidationRules): boolean => {
    const emailError = validateEmail(values.email);
    const passwordError = validatePassword(values.password);
    const displayNameError = validateDisplayName(values.displayName);

    setErrors({
      email: emailError,
      password: passwordError,
      displayName: displayNameError,
    });

    return !emailError && !passwordError && !displayNameError;
  };

  // Update isValid whenever errors change
  useEffect(() => {
    const hasErrors = Object.values(errors).some((error) => error !== '');
    setIsValid(!hasErrors);
  }, [errors]);

  return {
    errors,
    isValid,
    validate,
    validateAll,
  };
}
