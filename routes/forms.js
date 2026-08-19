const express = require('express');
const { body, validationResult } = require('express-validator');
const { catchAsync, AppError } = require('../utils/errorHandler');
const Booking = require('../models/BookingSupabase');
const Application = require('../models/ApplicationSupabase');
const Newsletter = require('../models/NewsletterSupabase');
const Feedback = require('../models/FeedbackSupabase');
const { sendEmail, emailTemplates } = require('../utils/mailer');
const { emitAdminEvent } = require('../utils/realtime');
const supabaseAdmin = require('../supabaseAdmin');

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
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: 'Name, email, subject, and message are required'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
        status: 'unread'
      })
      .select()
      .single();

    if (error) {
      console.error('Contact insert failed:', error);
      return res.status(500).json({
        message: 'Unable to save contact message'
      });
    }

    emitAdminEvent('contact.created', {
      id: data.id,
      type: 'contact',
      status: data.status
    });

    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'support@vialifecoach.org',
        subject: `New Contact Form Submission: ${data.subject}`,
        text: [
          'New contact form submission',
          `Name: ${data.name}`,
          `Email: ${data.email}`,
          `Phone: ${data.phone || 'Not provided'}`,
          `Subject: ${data.subject}`,
          '',
          data.message
        ].join('\n'),
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
        `
      });

      await sendEmail({
        ...emailTemplates.contactForm({
          name: data.name,
          message: data.message
        }),
        to: data.email
      });
    } catch (emailError) {
      console.error('Contact notification email failed:', emailError);
    }

    return res.status(201).json({
      success: true,
      contact: data
    });
  } catch (error) {
    console.error('Contact route failed:', error);
    return res.status(500).json({
      message: 'Unable to process contact message'
    });
  }
});

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
  emitAdminEvent('booking.created', {
    id: booking.id,
    program: booking.program,
    status: booking.status
  });
  
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
  emitAdminEvent('application.created', {
    id: application.id,
    type: application.type,
    status: application.status
  });
  
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
  emitAdminEvent('newsletter.subscribed', {
    id: subscription.id,
    email: subscription.email,
    preferences: subscription.preferences
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
