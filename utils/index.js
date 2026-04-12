// utils/index.js - Central export file for all utilities

// Export error handling utilities
const errorHandler = require('./errorHandler');
const { catchAsync, AppError, globalErrorHandler } = errorHandler;

// Export Supabase utilities
const supabaseUtils = require('./supabase');
const { supabase, testConnection } = supabaseUtils;

// Re-export everything
module.exports = {
  // Error handling
  catchAsync,
  AppError,
  globalErrorHandler,
  
  // Supabase
  supabase,
  testConnection,
  
  // Full objects for advanced use
  errorHandler,
  supabaseUtils
};