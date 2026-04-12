-- Add password reset fields to users table
-- Run this in your Supabase SQL Editor

-- Add password reset token field
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token TEXT;

-- Add password reset expiration field  
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Add password changed timestamp field
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookup of reset tokens
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add comment to explain the fields
COMMENT ON COLUMN users.password_reset_token IS 'JWT token for password reset, expires in 10 minutes';
COMMENT ON COLUMN users.password_reset_expires IS 'Timestamp when password reset token expires';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp when password was last changed';
