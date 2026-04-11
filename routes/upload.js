const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { catchAsync, AppError } = require('../utils/errorHandler');
const { protect, restrictTo } = require('../utils/auth');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Only images (jpeg, jpg, png, gif) and documents (pdf, doc, docx, txt) are allowed', 400));
  }
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

// POST /api/upload/single - Upload single file (protected)
router.post('/single', protect, upload.single('file'), catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  // Return file information
  res.status(200).json({
    status: 'success',
    message: 'File uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    }
  });
}));

// POST /api/upload/multiple - Upload multiple files (protected)
router.post('/multiple', protect, upload.array('files', 5), catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No files uploaded', 400));
  }

  const uploadedFiles = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
  }));

  res.status(200).json({
    status: 'success',
    message: `${req.files.length} files uploaded successfully`,
    data: {
      files: uploadedFiles
    }
  });
}));

// POST /api/upload/resume - Upload resume for application (public)
router.post('/resume', upload.single('resume'), catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No resume uploaded', 400));
  }

  // Validate that it's a document file
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    // Delete the uploaded file
    fs.unlinkSync(req.file.path);
    return next(new AppError('Only PDF and Word documents are allowed for resumes', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Resume uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    }
  });
}));

// DELETE /api/upload/:filename - Delete file (admin only)
router.delete('/:filename', protect, restrictTo('admin'), catchAsync(async (req, res, next) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return next(new AppError('File not found', 404));
  }

  // Delete file
  fs.unlinkSync(filePath);

  res.status(200).json({
    status: 'success',
    message: 'File deleted successfully'
  });
}));

// GET /api/upload/files - Get all uploaded files (admin only)
router.get('/files', protect, restrictTo('admin'), catchAsync(async (req, res, next) => {
  const files = fs.readdirSync(uploadDir).map(filename => {
    const filePath = path.join(uploadDir, filename);
    const stats = fs.statSync(filePath);
    
    return {
      filename,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      url: `${req.protocol}://${req.get('host')}/uploads/${filename}`
    };
  });

  res.status(200).json({
    status: 'success',
    results: files.length,
    data: {
      files
    }
  });
}));

module.exports = router;
