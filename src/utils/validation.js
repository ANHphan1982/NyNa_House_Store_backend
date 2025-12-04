// backend/src/utils/validation.js
const validator = require('validator');

/**
 * 🛡️ INPUT VALIDATION & SANITIZATION UTILITIES
 * Comprehensive validation functions for user inputs
 */

// ✅ SANITIZE STRING INPUT
const sanitizeString = (input, maxLength = 1000) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/\$/g, '') // Remove $
    .replace(/\./g, '') // Remove . (for NoSQL injection)
    .slice(0, maxLength); // Limit length
};

// ✅ SANITIZE HTML INPUT (allow some tags)
const sanitizeHTML = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '')
    .trim();
};

// ✅ VALIDATE PASSWORD
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Mật khẩu không được để trống'
    };
  }

  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Mật khẩu phải có ít nhất ${minLength} ký tự`
    };
  }

  if (!hasUpperCase) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 chữ hoa'
    };
  }

  if (!hasLowerCase) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 chữ thường'
    };
  }

  if (!hasNumbers) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 số'
    };
  }

  if (!hasSpecialChar) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)'
    };
  }

  // Check for common passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'abc12345', 
    'password123', 'admin123', 'letmein123', '123456789'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      message: 'Mật khẩu này quá phổ biến, vui lòng chọn mật khẩu khác'
    };
  }

  return {
    isValid: true,
    message: 'Mật khẩu hợp lệ'
  };
};

// ✅ VALIDATE EMAIL
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      message: 'Email không được để trống'
    };
  }

  const sanitizedEmail = email.trim().toLowerCase();

  if (!validator.isEmail(sanitizedEmail)) {
    return {
      isValid: false,
      message: 'Email không hợp lệ'
    };
  }

  // Check for disposable email domains
  const disposableDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email'
  ];

  const domain = sanitizedEmail.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return {
      isValid: false,
      message: 'Vui lòng sử dụng email thường xuyên, không phải email tạm'
    };
  }

  return {
    isValid: true,
    email: sanitizedEmail,
    message: 'Email hợp lệ'
  };
};

// ✅ VALIDATE PHONE NUMBER (Vietnam)
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      message: 'Số điện thoại không được để trống'
    };
  }

  const sanitizedPhone = phone.trim().replace(/\s+/g, '');

  // Vietnam phone number format: 0[3|5|7|8|9] + 8 digits
  const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;

  if (!phoneRegex.test(sanitizedPhone)) {
    return {
      isValid: false,
      message: 'Số điện thoại không hợp lệ. Định dạng: 0xxxxxxxxx (10 số)'
    };
  }

  return {
    isValid: true,
    phone: sanitizedPhone,
    message: 'Số điện thoại hợp lệ'
  };
};

// ✅ VALIDATE NAME
const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      message: 'Họ tên không được để trống'
    };
  }

  const sanitizedName = sanitizeString(name, 100);

  if (sanitizedName.length < 2) {
    return {
      isValid: false,
      message: 'Họ tên phải có ít nhất 2 ký tự'
    };
  }

  if (sanitizedName.length > 100) {
    return {
      isValid: false,
      message: 'Họ tên không được quá 100 ký tự'
    };
  }

  // Check for numbers in name
  if (/\d/.test(sanitizedName)) {
    return {
      isValid: false,
      message: 'Họ tên không được chứa số'
    };
  }

  // Check for special characters (allow Vietnamese characters)
  const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
  if (!nameRegex.test(sanitizedName)) {
    return {
      isValid: false,
      message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng'
    };
  }

  return {
    isValid: true,
    name: sanitizedName,
    message: 'Họ tên hợp lệ'
  };
};

// ✅ VALIDATE ADDRESS
const validateAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      message: 'Địa chỉ không được để trống'
    };
  }

  const sanitizedAddress = sanitizeString(address, 500);

  if (sanitizedAddress.length < 10) {
    return {
      isValid: false,
      message: 'Địa chỉ quá ngắn, vui lòng nhập chi tiết hơn'
    };
  }

  if (sanitizedAddress.length > 500) {
    return {
      isValid: false,
      message: 'Địa chỉ không được quá 500 ký tự'
    };
  }

  return {
    isValid: true,
    address: sanitizedAddress,
    message: 'Địa chỉ hợp lệ'
  };
};

// ✅ VALIDATE PRICE
const validatePrice = (price) => {
  const numPrice = Number(price);

  if (isNaN(numPrice)) {
    return {
      isValid: false,
      message: 'Giá không hợp lệ'
    };
  }

  if (numPrice < 0) {
    return {
      isValid: false,
      message: 'Giá không được âm'
    };
  }

  if (numPrice > 1000000000) { // 1 billion VND
    return {
      isValid: false,
      message: 'Giá quá cao'
    };
  }

  return {
    isValid: true,
    price: numPrice,
    message: 'Giá hợp lệ'
  };
};

// ✅ VALIDATE QUANTITY
const validateQuantity = (quantity) => {
  const numQty = Number(quantity);

  if (isNaN(numQty) || !Number.isInteger(numQty)) {
    return {
      isValid: false,
      message: 'Số lượng phải là số nguyên'
    };
  }

  if (numQty < 1) {
    return {
      isValid: false,
      message: 'Số lượng phải lớn hơn 0'
    };
  }

  if (numQty > 1000) {
    return {
      isValid: false,
      message: 'Số lượng không được vượt quá 1000'
    };
  }

  return {
    isValid: true,
    quantity: numQty,
    message: 'Số lượng hợp lệ'
  };
};

// ✅ VALIDATE PRODUCT ID
const validateProductId = (productId) => {
  if (!productId) {
    return {
      isValid: false,
      message: 'Product ID không được để trống'
    };
  }

  // Accept both MongoDB ObjectId and Number ID
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(productId));
  const isNumericId = !isNaN(Number(productId));

  if (!isObjectId && !isNumericId) {
    return {
      isValid: false,
      message: 'Product ID không hợp lệ'
    };
  }

  return {
    isValid: true,
    productId: productId,
    message: 'Product ID hợp lệ'
  };
};

// ✅ SANITIZE OBJECT (recursively)
const sanitizeObject = (obj, maxDepth = 5, currentDepth = 0) => {
  if (currentDepth >= maxDepth) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Skip if key starts with $ or contains .
        if (key.startsWith('$') || key.includes('.')) {
          console.warn(`⚠️ Skipping potentially dangerous key: ${key}`);
          continue;
        }
        
        const value = obj[key];
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else {
          sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
        }
      }
    }
    return sanitized;
  }

  return obj;
};

// ✅ VALIDATE ORDER DATA
const validateOrderData = (orderData) => {
  const errors = [];

  // Validate products
  if (!orderData.products || !Array.isArray(orderData.products) || orderData.products.length === 0) {
    errors.push('Đơn hàng phải có ít nhất 1 sản phẩm');
  } else {
    orderData.products.forEach((item, index) => {
      const prodIdResult = validateProductId(item.productId);
      if (!prodIdResult.isValid) {
        errors.push(`Sản phẩm ${index + 1}: ${prodIdResult.message}`);
      }

      const qtyResult = validateQuantity(item.quantity);
      if (!qtyResult.isValid) {
        errors.push(`Sản phẩm ${index + 1}: ${qtyResult.message}`);
      }

      const priceResult = validatePrice(item.price);
      if (!priceResult.isValid) {
        errors.push(`Sản phẩm ${index + 1}: ${priceResult.message}`);
      }
    });
  }

  // Validate shipping address
  if (!orderData.shippingAddress) {
    errors.push('Thiếu thông tin địa chỉ giao hàng');
  } else {
    const nameResult = validateName(orderData.shippingAddress.fullName);
    if (!nameResult.isValid) {
      errors.push(`Địa chỉ giao hàng: ${nameResult.message}`);
    }

    const phoneResult = validatePhone(orderData.shippingAddress.phone);
    if (!phoneResult.isValid) {
      errors.push(`Địa chỉ giao hàng: ${phoneResult.message}`);
    }

    const addressResult = validateAddress(orderData.shippingAddress.address);
    if (!addressResult.isValid) {
      errors.push(`Địa chỉ giao hàng: ${addressResult.message}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    message: errors.length === 0 ? 'Dữ liệu đơn hàng hợp lệ' : errors.join('; ')
  };
};

module.exports = {
  sanitizeString,
  sanitizeHTML,
  sanitizeObject,
  validatePassword,
  validateEmail,
  validatePhone,
  validateName,
  validateAddress,
  validatePrice,
  validateQuantity,
  validateProductId,
  validateOrderData
};