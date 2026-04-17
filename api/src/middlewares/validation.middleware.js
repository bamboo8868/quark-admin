import { ValidationError } from './error.middleware.js';

/**
 * Validate request body against a schema
 */
export function validateBody(schema) {
  return async function(request, reply) {
    try {
      const result = await schema.validateAsync(request.body, {
        abortEarly: false,
        stripUnknown: true
      });
      request.body = result;
    } catch (error) {
      const details = error.details?.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })) || [{ message: error.message }];
      
      throw new ValidationError('Validation failed', details);
    }
  };
}

/**
 * Validate request query against a schema
 */
export function validateQuery(schema) {
  return async function(request, reply) {
    try {
      const result = await schema.validateAsync(request.query, {
        abortEarly: false,
        stripUnknown: true
      });
      request.query = result;
    } catch (error) {
      const details = error.details?.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })) || [{ message: error.message }];
      
      throw new ValidationError('Query validation failed', details);
    }
  };
}

/**
 * Validate request params against a schema
 */
export function validateParams(schema) {
  return async function(request, reply) {
    try {
      const result = await schema.validateAsync(request.params, {
        abortEarly: false,
        stripUnknown: true
      });
      request.params = result;
    } catch (error) {
      const details = error.details?.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })) || [{ message: error.message }];
      
      throw new ValidationError('Params validation failed', details);
    }
  };
}

/**
 * Simple validation schema builder (lightweight alternative to Joi/Yup)
 */
export class ValidationSchema {
  constructor() {
    this.rules = {};
  }

  static object(rules) {
    const schema = new ValidationSchema();
    schema.rules = rules;
    return schema;
  }

  async validateAsync(data, options = {}) {
    const errors = [];
    const result = {};

    for (const [key, validator] of Object.entries(this.rules)) {
      const value = data[key];
      
      try {
        const validatedValue = await this.validateField(key, value, validator);
        if (validatedValue !== undefined || !options.stripUnknown) {
          result[key] = validatedValue;
        }
      } catch (error) {
        errors.push({
          path: [key],
          message: error.message
        });
      }
    }

    if (errors.length > 0 && !options.abortEarly) {
      const error = new Error('Validation failed');
      error.details = errors;
      throw error;
    }

    return result;
  }

  async validateField(key, value, validator) {
    if (typeof validator === 'function') {
      return await validator(value, key);
    }
    
    if (validator instanceof ValidationSchema) {
      return await validator.validateAsync(value || {});
    }

    return value;
  }
}

/**
 * Validation helpers
 */
export const v = {
  string(message = 'Must be a string') {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      if (typeof value !== 'string') {
        throw new Error(message);
      }
      return value;
    };
  },

  number(message = 'Must be a number') {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(message);
      }
      return num;
    };
  },

  email(message = 'Must be a valid email') {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error(message);
      }
      return value;
    };
  },

  min(length, message) {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      const msg = message || `Must be at least ${length} characters`;
      if (typeof value === 'string' && value.length < length) {
        throw new Error(msg);
      }
      if (typeof value === 'number' && value < length) {
        throw new Error(msg);
      }
      return value;
    };
  },

  max(length, message) {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      const msg = message || `Must be at most ${length} characters`;
      if (typeof value === 'string' && value.length > length) {
        throw new Error(msg);
      }
      if (typeof value === 'number' && value > length) {
        throw new Error(msg);
      }
      return value;
    };
  },

  required(message = 'This field is required') {
    return (value, key) => {
      if (value === undefined || value === null || value === '') {
        throw new Error(message);
      }
      return value;
    };
  },

  boolean(message = 'Must be a boolean') {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      if (typeof value !== 'boolean') {
        throw new Error(message);
      }
      return value;
    };
  },

  array(message = 'Must be an array') {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      if (!Array.isArray(value)) {
        throw new Error(message);
      }
      return value;
    };
  },

  oneOf(values, message) {
    return (value, key) => {
      if (value === undefined || value === null) {
        return value;
      }
      const msg = message || `Must be one of: ${values.join(', ')}`;
      if (!values.includes(value)) {
        throw new Error(msg);
      }
      return value;
    };
  }
};

/**
 * Compose multiple validators
 */
export function compose(...validators) {
  return async (value, key) => {
    let result = value;
    for (const validator of validators) {
      result = await validator(result, key);
    }
    return result;
  };
}
