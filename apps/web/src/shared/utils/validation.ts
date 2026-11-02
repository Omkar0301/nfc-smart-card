/**
 * Normalizes and validates a phone number.
 * Accepts:
 * - E.164 formatted numbers: +[1-9]\d{7,14} (e.g. +919876543210, +15551234567)
 * - 10-digit national numbers: 10 digits (e.g. 9876543210), normalized to +919876543210
 * - Human-formatted inputs with spaces, dashes, or parentheses: e.g. "+91 98765-43210"
 */
export function validateAndNormalizePhone(raw: string): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }

  // Remove whitespace, dashes, and parentheses
  const stripped = trimmed.replace(/[\s\-()]/g, '');

  if (stripped.startsWith('+')) {
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(stripped)) {
      if (/[^\d+]/.test(stripped)) {
        return {
          isValid: false,
          normalized: stripped,
          error: 'Phone number can only contain digits, spaces, and a leading "+".',
        };
      }
      if (stripped.length < 9) {
        return {
          isValid: false,
          normalized: stripped,
          error: 'Phone number is too short. Include country code (e.g. +919876543210).',
        };
      }
      return {
        isValid: false,
        normalized: stripped,
        error: 'Invalid phone format. Please enter a valid number (e.g. +919876543210).',
      };
    }
    return { isValid: true, normalized: stripped };
  }

  // If no leading '+'
  if (/^\d{10}$/.test(stripped)) {
    // 10-digit Indian standard phone number -> prepend +91
    return { isValid: true, normalized: `+91${stripped}` };
  }

  if (/[^\d]/.test(stripped)) {
    return {
      isValid: false,
      normalized: stripped,
      error: 'Phone number can only contain digits, spaces, and hyphens.',
    };
  }

  if (stripped.length < 10) {
    return {
      isValid: false,
      normalized: stripped,
      error: 'Phone number must be at least 10 digits (or include country code, e.g. +91).',
    };
  }

  if (stripped.length > 15) {
    return {
      isValid: false,
      normalized: stripped,
      error: 'Phone number is too long (maximum 15 digits).',
    };
  }

  // Numbers between 11 and 15 digits without '+' (e.g. "919876543210")
  if (stripped.length >= 11 && stripped.length <= 15) {
    return { isValid: true, normalized: `+${stripped}` };
  }

  return {
    isValid: false,
    normalized: stripped,
    error: 'Please enter a valid phone number (e.g. +919876543210 or 10-digit mobile number).',
  };
}

/**
 * Validates a 6-digit numeric OTP code.
 */
export function validateOtpCode(code: string): {
  isValid: boolean;
  cleanCode: string;
  error?: string;
} {
  const clean = code.replace(/\D/g, '').slice(0, 6);
  if (clean.length === 0) {
    return { isValid: false, cleanCode: '', error: 'Verification code is required.' };
  }
  if (clean.length < 6) {
    return {
      isValid: false,
      cleanCode: clean,
      error: `Please enter all 6 digits (${clean.length}/6 entered).`,
    };
  }
  return { isValid: true, cleanCode: clean };
}

/**
 * Validates an email address format.
 */
export function validateEmail(email: string): {
  isValid: boolean;
  trimmedEmail: string;
  error?: string;
} {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, trimmedEmail: '', error: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      trimmedEmail: trimmed,
      error: 'Please enter a valid email address (e.g. name@example.com).',
    };
  }
  return { isValid: true, trimmedEmail: trimmed };
}
