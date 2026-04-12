// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Production error response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle duplicate fields error (for MongoDB/PostgreSQL)
const handleDuplicateFieldsDB = (err) => {
  // Check if err.errmsg exists (MongoDB) or handle PostgreSQL duplicate error
  let value = '';
  if (err.errmsg) {
    const match = err.errmsg.match(/(["'])(\\?.)*?\1/);
    value = match ? match[0] : 'unknown';
  } else if (err.code === '23505') { // PostgreSQL duplicate key error code
    value = err.detail || 'duplicate key value';
  }
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Handle validation errors (for MongoDB or custom validation)
const handleValidationErrorDB = (err) => {
  let errors = [];
  if (err.errors) {
    errors = Object.values(err.errors).map(el => el.message);
  } else if (err.message) {
    errors = [err.message];
  }
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle cast errors (for MongoDB)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path || 'field'}: ${err.value || 'invalid value'}.`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Handle Supabase specific errors
const handleSupabaseError = (err) => {
  if (err.code === 'PGRST301') {
    return new AppError('Invalid request format', 400);
  }
  if (err.code === '42501') {
    return new AppError('Permission denied. Please check your credentials.', 403);
  }
  if (err.code === '42P01') {
    return new AppError('Table does not exist. Please contact support.', 500);
  }
  return null;
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle Supabase errors
  const supabaseError = handleSupabaseError(err);
  if (supabaseError) {
    err = supabaseError;
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.code = err.code;
    error.detail = err.detail;

    // Handle specific error types
    if (error.code === 11000 || error.code === '23505') error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

module.exports = {
  catchAsync,
  AppError,
  globalErrorHandler
};