export const MAX_FIELD_LENGTH = 100;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => {
    const trimmed = (email || '').trim();
    if (!trimmed) return true;
    return EMAIL_REGEX.test(trimmed) && trimmed.length <= MAX_FIELD_LENGTH;
};

export const validateRequiredString = (value, label) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return `${label} is required.`;
    if (trimmed.length > MAX_FIELD_LENGTH) return `${label} is too long (maximum ${MAX_FIELD_LENGTH} characters).`;
    return null;
};

export const validateOptionalString = (value, label) => {
    const trimmed = (value || '').trim();
    if (trimmed.length > MAX_FIELD_LENGTH) return `${label} is too long (maximum ${MAX_FIELD_LENGTH} characters).`;
    return null;
};

export const validatePositiveNumber = (value, label, { required = true, allowZero = false } = {}) => {
    if (value === '' || value === null || value === undefined) {
        return required ? `${label} is required.` : null;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return `${label} must be a valid number.`;
    if (allowZero ? num < 0 : num <= 0) return `${label} must be greater than ${allowZero ? 'or equal to 0' : '0'}.`;
    return null;
};
