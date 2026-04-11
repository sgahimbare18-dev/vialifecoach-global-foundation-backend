const express = require('express');
const { body, validationResult } = require('express-validator');
const { catchAsync, AppError } = require('../utils/errorHandler');
const Booking = require('../models/BookingSupabase');
const Application = require('../models/ApplicationSupabase');
const Newsletter = require('../models/NewsletterSupabase');
const { sendEmail, emailTemplates } = require('../utils/mailer');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(`Invalid input data. ${errorMessages.join('. ')}`, 400));
  }
  next();
};

// POST /api/contact - Contact form submission
router.post('/contact', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('subject')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Subject must be between 3 and 100 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
], handleValidationErrors, catchAsync(async (req, res, next) => {
  const { name, email, subject, message, phone } = req.body;
  
  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'support@vialifecoach.org',
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <hr>
        <p><small>Submitted on: ${new Date().toLocaleString()}</small></p>
      `
    });
    
    // Send confirmation email to user
    await sendEmail(emailTemplates.contactForm({ name, message }));
  } catch (error) {
    console.error('Email sending failed:', error);
    // Continue with response even if email fails
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Your message has been sent successfully. We will get back to you soon!'
  });
}));

// POST /api/partnership - Partnership form submission
router.post('/partnership', [
  body('organizationName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),
  body('contactPerson')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Contact person name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('partnershipType')
    .trim()
    .isIn(['sponsorship', 'collaboration', 'volunteer', 'donation', 'other'])
    .withMessage('Please select a valid partnership type'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL')
], handleValidationErrors, catchAsync(async (req, res, next) => {
  const { organizationName, contactPerson, email, phone, partnershipType, description, website } = req.body;
  
  try {
    await sendEmail({
      to: process.env.PARTNERSHIP_EMAIL || 'partnership@vialifecoach.org',
      subject: `New Partnership Inquiry: ${organizationName}`,
      html: `
        <h2>New Partnership Inquiry</h2>
        <p><strong>Organization:</strong> ${organizationName}</p>
        <p><strong>Contact Person:</strong> ${contactPerson}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Partnership Type:</strong> ${partnershipType}</p>
        ${website ? `<p><strong>Website:</strong> <a href="${website}">${website}</a></p>` : ''}
        <p><strong>Description:</strong></p>
        <p>${description}</p>
        <hr>
        <p><small>Submitted on: ${new Date().toLocaleString()}</small></p>
      `
    });
    
    // Send confirmation email to organization
    await sendEmail(emailTemplates.partnershipInquiry({ 
      contactPerson, 
      email 
    }));
  } catch (error) {
    console.error('Email sending failed:', error);
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Your partnership inquiry has been submitted successfully. We will contact you soon!'
  });
}));

// POST /api/bookings - Coaching session booking
router.post('/bookings', [
  body('program')
    .trim()
    .isIn(['Life Coaching', 'Career Development', 'Leadership Training', 'Youth Mentorship', 'Family Counseling', 'Wellness Coaching', 'Financial Planning', 'Spiritual Guidance'])
    .withMessage('Please select a valid program'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('preferredDate')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('preferredTime')
    .trim()
    .isIn(['Morning (9AM-12PM)', 'Afternoon (12PM-5PM)', 'Evening (5PM-8PM)'])
    .withMessage('Please select a valid time preference'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters')
], handleValidationErrors, catchAsync(async (req, res, next) => {
  const bookingData = {
    ...req.body,
    preferredDate: new Date(req.body.preferredDate)
  };
  
  const booking = await Booking.create(bookingData);
  
  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'support@vialifecoach.org',
      subject: `New Coaching Session Booking: ${booking.program}`,
      html: `
        <h2>New Coaching Session Booking</h2>
        <p><strong>Program:</strong> ${booking.program}</p>
        <p><strong>Name:</strong> ${booking.name}</p>
        <p><strong>Email:</strong> ${booking.email}</p>
        <p><strong>Phone:</strong> ${booking.phone}</p>
        <p><strong>Preferred Date:</strong> ${booking.preferredDate.toLocaleDateString()}</p>
        <p><strong>Preferred Time:</strong> ${booking.preferredTime}</p>
        ${booking.message ? `<p><strong>Message:</strong> ${booking.message}</p>` : ''}
        <p><strong>Status:</strong> ${booking.status}</p>
        <hr>
        <p><small>Submitted on: ${booking.createdAt.toLocaleString()}</small></p>
      `
    });
    
    // Send confirmation email to client
    await sendEmail(emailTemplates.bookingConfirmation(booking));
  } catch (error) {
    console.error('Email sending failed:', error);
  }
  
  res.status(201).json({
    status: 'success',
    message: 'Your coaching session has been booked successfully. We will contact you soon to confirm the details!',
    data: {
      booking
    }
  });
}));

// POST /api/volunteer - Volunteer application
router.post('/volunteer', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('age')
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('motivation')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Motivation must be between 20 and 2000 characters'),
  body('experience')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Experience cannot exceed 2000 characters'),
  body('availability')
    .trim()
    .isIn(['Full-time', 'Part-time', 'Weekends only', 'Flexible'])
    .withMessage('Please select a valid availability option'),
  body('skills')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Skills cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isIn(['volunteer', 'mentor', 'partner', 'intern'])
    .withMessage('Please select a valid application type')
], handleValidationErrors, catchAsync(async (req, res, next) => {
  const applicationData = {
    ...req.body,
    type: req.body.type || 'volunteer'
  };
  
  const application = await Application.create(applicationData);
  
  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'support@vialifecoach.org',
      subject: `New Volunteer Application: ${application.name}`,
      html: `
        <h2>New Volunteer Application</h2>
        <p><strong>Name:</strong> ${application.name}</p>
        <p><strong>Email:</strong> ${application.email}</p>
        <p><strong>Phone:</strong> ${application.phone}</p>
        <p><strong>Age:</strong> ${application.age}</p>
        <p><strong>Location:</strong> ${application.location}</p>
        <p><strong>Availability:</strong> ${application.availability}</p>
        ${application.skills ? `<p><strong>Skills:</strong> ${application.skills}</p>` : ''}
        <p><strong>Motivation:</strong></p>
        <p>${application.motivation}</p>
        ${application.experience ? `<p><strong>Experience:</strong></p><p>${application.experience}</p>` : ''}
        <p><strong>Status:</strong> ${application.status}</p>
        <hr>
        <p><small>Submitted on: ${application.createdAt.toLocaleString()}</small></p>
      `
    });
    
    // Send confirmation email to applicant
    await sendEmail(emailTemplates.applicationReceived(application));
  } catch (error) {
    console.error('Email sending failed:', error);
  }
  
  res.status(201).json({
    status: 'success',
    message: 'Your volunteer application has been submitted successfully. We will contact you soon!',
    data: {
      application
    }
  });
}));

// POST /api/newsletter/subscribe - Newsletter subscription
router.post('/newsletter/subscribe', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('preferences')
    .optional()
    .isIn(['all', 'events', 'newsletter', 'updates'])
    .withMessage('Please select valid preferences')
], handleValidationErrors, catchAsync(async (req, res, next) => {
  const { email, name, preferences = 'all' } = req.body;
  
  // Check if already subscribed
  const existingSubscription = await Newsletter.findOne({ email });
  if (existingSubscription && existingSubscription.is_active) {
    return next(new AppError('You are already subscribed to our newsletter', 400));
  }
  
  // Create or update subscription
  const subscription = await Newsletter.create({
    email, 
    name, 
    preferences, 
    is_active: true, 
    subscribed_at: new Date()
  });
  
  // Send welcome email
  try {
    await sendEmail(emailTemplates.newsletterWelcome({ email, name }));
  } catch (error) {
    console.error('Email sending failed:', error);
  }
  
  res.status(201).json({
    status: 'success',
    message: 'Thank you for subscribing to our newsletter!',
    data: {
      subscription
    }
  });
}));

module.exports = router;
