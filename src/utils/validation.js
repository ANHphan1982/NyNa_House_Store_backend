// backend/src/config/validation.js

/**
 * 🔒 INPUT VALIDATION & SANITIZATION
 * Comprehensive validation and sanitization functions for user inputs
 */

// =====================================
// SANITIZATION FUNCTIONS
// =====================================

/**
 * Sanitize general string (remove dangerous characters)
 * @param {string} str - Input string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '')           // Remove < >
    .replace(/javascript:/gi, '')   // Remove javascript:
    .replace(/on\w+=/gi, '')        // Remove onX= event handlers
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
};

/**
 * Sanitize name (allow letters, spaces, hyphens, apostrophes)
 * Supports Vietnamese characters
 * @param {string} name - Name to sanitize
 * @returns {string} Sanitized name
 */
const sanitizeName = (name) => {
  if (typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/[^a-zA-ZÀ-ỹ\s'-]/g, '') // Allow Vietnamese, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ')              // Replace multiple spaces with single space
    .substring(0, 100);                // Max length 100 chars
};

/**
 * Sanitize email (convert to lowercase, remove whitespace)
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>]/g, '')
    .replace(/\s/g, ''); // Remove all whitespace
};

/**
 * Sanitize phone (remove non-digits except +)
 * @param {string} phone - Phone number to sanitize
 * @returns {string} Sanitized phone
 */
const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  return phone
    .trim()
    .replace(/[^\d+]/g, ''); // Keep only digits and +
};

/**
 * Sanitize address (remove dangerous characters but keep Vietnamese)
 * @param {string} address - Address to sanitize
 * @returns {string} Sanitized address
 */
const sanitizeAddress = (address) => {
  if (typeof address !== 'string') return '';
  return address
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .substring(0, 500); // Max 500 chars
};

// =====================================
// VALIDATION FUNCTIONS
// =====================================

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * @param {string} password - Password to validate
 * @returns {Object} {isValid: boolean, message: string}
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Mật khẩu là bắt buộc'
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 chữ hoa'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 chữ thường'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 số'
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt'
    };
  }

  return {
    isValid: true,
    message: 'Mật khẩu hợp lệ'
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate phone format (Vietnamese)
 * Accepts: 10 digits starting with 0, or +84 followed by 9 digits
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleanPhone = phone.trim();
  
  // Vietnamese phone: 10 digits, starts with 0
  const phoneRegex1 = /^0\d{9}$/;
  
  // International format: +84 followed by 9 digits
  const phoneRegex2 = /^\+84\d{9}$/;
  
  return phoneRegex1.test(cleanPhone) || phoneRegex2.test(cleanPhone);
};

/**
 * Validate registration data
 * @param {Object} data - Registration data {name, email, phone, password}
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
const validateRegistrationData = (data) => {
  const errors = [];

  // Name validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Tên phải có ít nhất 2 ký tự');
  }

  // Email or Phone required
  if (!data.email && !data.phone) {
    errors.push('Email hoặc số điện thoại là bắt buộc');
  }

  // Email format if provided
  if (data.email && !validateEmail(data.email)) {
    errors.push('Email không hợp lệ');
  }

  // Phone format if provided
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0 hoặc +84)');
  }

  // Password validation
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.message);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate login data
 * @param {Object} data - Login data {identifier, password}
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
const validateLoginData = (data) => {
  const errors = [];

  // Identifier required (email or phone)
  if (!data.identifier || typeof data.identifier !== 'string' || data.identifier.trim().length === 0) {
    errors.push('Email hoặc số điện thoại là bắt buộc');
  }

  // Password required
  if (!data.password || typeof data.password !== 'string' || data.password.length === 0) {
    errors.push('Mật khẩu là bắt buộc');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate product data
 * @param {Object} data - Product data {name, price, stock, etc}
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
const validateProductData = (data) => {
  const errors = [];

  // Name required
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Tên sản phẩm phải có ít nhất 2 ký tự');
  }

  // Price required and must be positive
  if (!data.price || isNaN(data.price) || Number(data.price) <= 0) {
    errors.push('Giá sản phẩm phải lớn hơn 0');
  }

  // Stock must be non-negative if provided
  if (data.stock !== undefined && (isNaN(data.stock) || Number(data.stock) < 0)) {
    errors.push('Số lượng tồn kho không được âm');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate order data
 * @param {Object} data - Order data {products, shippingAddress, etc}
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
const validateOrderData = (data) => {
  const errors = [];

  // Products required
  if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
    errors.push('Đơn hàng phải có ít nhất 1 sản phẩm');
  }

  // Shipping address required
  if (!data.shippingAddress || typeof data.shippingAddress !== 'object') {
    errors.push('Địa chỉ giao hàng là bắt buộc');
  } else {
    if (!data.shippingAddress.fullName || data.shippingAddress.fullName.trim().length < 2) {
      errors.push('Họ tên người nhận phải có ít nhất 2 ký tự');
    }
    if (!data.shippingAddress.phone || !validatePhone(data.shippingAddress.phone)) {
      errors.push('Số điện thoại người nhận không hợp lệ');
    }
    if (!data.shippingAddress.address || data.shippingAddress.address.trim().length < 5) {
      errors.push('Địa chỉ giao hàng phải có ít nhất 5 ký tự');
    }
  }

  // Payment method required
  if (!data.paymentMethod) {
    errors.push('Phương thức thanh toán là bắt buộc');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
  // Sanitization functions
  sanitizeString,
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeAddress,
  
  // Validation functions
  validatePassword,
  validateEmail,
  validatePhone,
  validateRegistrationData,
  validateLoginData,
  validateProductData,
  validateOrderData
};