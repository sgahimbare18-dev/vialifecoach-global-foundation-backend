const express = require('express');
const { catchAsync, AppError } = require('../utils/errorHandler');
const { requireAdmin } = require('../utils/auth');
const User = require('../models/UserSupabase');
const Booking = require('../models/BookingSupabase');
const Application = require('../models/ApplicationSupabase');
const Newsletter = require('../models/NewsletterSupabase');
const Donation = require('../models/DonationSupabase');
const Feedback = require('../models/FeedbackSupabase');
const { sendEmail, emailTemplates } = require('../utils/mailer');
const SupabaseQueries = require('../utils/supabaseQueries');
const { supabase } = require('../utils/supabase');
const supabaseAdmin = require('../supabaseAdmin');
const { emitAdminEvent } = require('../utils/realtime');

const router = express.Router();

// All admin routes require a valid admin JWT
router.use(requireAdmin);

// GET /api/admin/contact - Get contact form submissions
router.get('/contact', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Contact fetch failed:', error);
      return res.status(500).json({
        message: 'Unable to load contact messages'
      });
    }

    return res.json({
      success: true,
      contacts: data || []
    });
  } catch (error) {
    console.error('Admin contact route failed:', error);
    return res.status(500).json({
      message: 'Unable to load contact messages'
    });
  }
});

// GET /api/admin/dashboard - Dashboard statistics
router.get('/dashboard', catchAsync(async (req, res, next) => {
  const stats = await SupabaseQueries.getDashboardStats();
  
  const [bookingsByProgram, applicationsByType, recentActivity] = await Promise.all([
    SupabaseQueries.getBookingsByProgram(),
    SupabaseQueries.getApplicationsByType(),
    SupabaseQueries.getRecentActivity()
  ]);

  const {
    totalUsers,
    activeUsers,
    totalBookings,
    pendingBookings,
    totalApplications,
    pendingApplications,
    totalSubscribers,
    totalDonations
  } = stats;

  res.status(200).json({
    status: 'success',
    data: {
      statistics: {
        totalUsers,
        activeUsers,
        totalBookings,
        pendingBookings,
        totalApplications,
        pendingApplications,
        totalSubscribers,
        totalDonations
      },
      charts: {
        bookingsByProgram,
        applicationsByType
      },
      recentActivity
    }
  });
}));

// GET /api/admin/donations - Get all donations with filtering
router.get('/donations', catchAsync(async (req, res, next) => {
  const { status, payment_method, provider, frequency, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (payment_method) filter.payment_method = payment_method;
  if (provider) filter.provider = provider;
  if (frequency) filter.frequency = frequency;

  const pagination = { page: parseInt(page, 10), limit: parseInt(limit, 10) };

  const { data: donations, count: total } = await Donation.findMany(filter, pagination);

  res.status(200).json({
    status: 'success',
    results: donations.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page, 10),
    data: {
      donations
    }
  });
}));

// GET /api/admin/applications - Get all applications with filtering
router.get('/applications', catchAsync(async (req, res, next) => {
  console.log('🔍 Admin applications API called');
  console.log('🔍 User:', req.user);
  
  const { status, type, page = 1, limit = 10 } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const pageNumber = Number.isInteger(parseInt(page, 10)) ? parseInt(page, 10) : 1;
  const limitNumber = Number.isInteger(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
  const pagination = { page: pageNumber, limit: limitNumber };

  console.log('🔍 Filter:', filter);
  console.log('🔍 Pagination:', pagination);

  const result = await Application.findMany(filter, pagination);
  const applications = Array.isArray(result.data) ? result.data : [];
  const total = typeof result.count === 'number' ? result.count : applications.length;

  console.log('🔍 Applications found:', applications.length);
  console.log('🔍 Total count:', total);

  const response = {
    status: 'success',
    results: applications.length,
    total,
    pages: Math.ceil(total / pagination.limit),
    currentPage: pagination.page,
    data: {
      applications
    }
  };

  console.log('🔍 Sending applications response:', {
    status: response.status,
    results: response.results,
    total: response.total,
    pages: response.pages,
    currentPage: response.currentPage,
    hasApplications: applications.length > 0
  });

  res.status(200).json(response);
}));

// PUT /api/admin/applications/:id - Update application status
router.put('/applications/:id', catchAsync(async (req, res, next) => {
  const { status, interviewDate, interviewNotes, rejectionReason } = req.body;
  
  const application = await Application.updateById(
    req.params.id,
    {
      status,
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
      interviewNotes,
      rejectionReason,
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    }
  );

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  // Send email notification to applicant
  try {
    let emailData;
    
    if (status === 'approved') {
      emailData = {
        to: application.email,
        subject: 'Application Approved - Vialifecoach Global Foundation',
        html: `
          <h2>Congratulations! Your Application Has Been Approved</h2>
          <p>Dear ${application.name},</p>
          <p>We are pleased to inform you that your ${application.type} application has been approved!</p>
          <p>Our team will contact you soon with the next steps.</p>
          <p>Best regards,<br>Vialifecoach Global Foundation Team</p>
        `
      };
    } else if (status === 'rejected') {
      emailData = {
        to: application.email,
        subject: 'Application Update - Vialifecoach Global Foundation',
        html: `
          <h2>Application Update</h2>
          <p>Dear ${application.name},</p>
          <p>Thank you for your interest in Vialifecoach Global Foundation.</p>
          <p>After careful consideration, we regret to inform you that your application was not selected at this time.</p>
          ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
          <p>We encourage you to apply again in the future and wish you the best in your endeavors.</p>
          <p>Best regards,<br>Vialifecoach Global Foundation Team</p>
        `
      };
    } else if (status === 'interview_scheduled') {
      emailData = {
        to: application.email,
        subject: 'Interview Scheduled - Vialifecoach Global Foundation',
        html: `
          <h2>Interview Scheduled</h2>
          <p>Dear ${application.name},</p>
          <p>Your application has been shortlisted and we would like to schedule an interview.</p>
          <p><strong>Interview Date:</strong> ${new Date(interviewDate).toLocaleString()}</p>
          <p>We will send you a separate calendar invitation with the meeting details.</p>
          <p>Best regards,<br>Vialifecoach Global Foundation Team</p>
        `
      };
    }

    if (emailData) {
      await sendEmail(emailData);
    }
  } catch (error) {
    console.error('Failed to send application status email:', error);
  }

  emitAdminEvent('application.updated', {
    id: application.id,
    type: application.type,
    status: application.status
  });

  res.status(200).json({
    status: 'success',
    message: 'Application updated successfully',
    data: {
      application
    }
  });
}));

// GET /api/admin/bookings - Get all bookings with filtering
router.get('/bookings', catchAsync(async (req, res, next) => {
  const { status, program, page = 1, limit = 10 } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (program) filter.program = program;

  const pagination = { page: parseInt(page), limit: parseInt(limit) };

  const { data: bookings, count: total } = await Booking.findMany(filter, pagination);

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: {
      bookings
    }
  });
}));

// PUT /api/admin/bookings/:id - Update booking status
router.put('/bookings/:id', catchAsync(async (req, res, next) => {
  const { status, assignedMentor, sessionNotes, followUpRequired, followUpDate } = req.body;
  
  const booking = await Booking.updateById(
    req.params.id,
    {
      status,
      assignedMentor,
      sessionNotes,
      followUpRequired,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined
    }
  );

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Send email notification to client
  try {
    let emailData;
    
    if (status === 'confirmed') {
      emailData = {
        to: booking.email,
        subject: 'Coaching Session Confirmed - Vialifecoach Global Foundation',
        html: `
          <h2>Your Coaching Session Has Been Confirmed!</h2>
          <p>Dear ${booking.name},</p>
          <p>We are pleased to confirm your coaching session:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Session Details:</h3>
            <p><strong>Program:</strong> ${booking.program}</p>
            <p><strong>Date:</strong> ${booking.preferredDate.toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${booking.preferredTime}</p>
            ${assignedMentor ? `<p><strong>Mentor:</strong> ${booking.assignedMentor.name}</p>` : ''}
          </div>
          <p>We look forward to working with you!</p>
          <p>Best regards,<br>Vialifecoach Global Foundation</p>
        `
      };
    } else if (status === 'cancelled') {
      emailData = {
        to: booking.email,
        subject: 'Coaching Session Update - Vialifecoach Global Foundation',
        html: `
          <h2>Coaching Session Update</h2>
          <p>Dear ${booking.name},</p>
          <p>Your coaching session has been cancelled.</p>
          <p>If you would like to reschedule, please contact us directly.</p>
          <p>Best regards,<br>Vialifecoach Global Foundation</p>
        `
      };
    }

    if (emailData) {
      await sendEmail(emailData);
    }
  } catch (error) {
    console.error('Failed to send booking status email:', error);
  }

  emitAdminEvent('booking.updated', {
    id: booking.id,
    program: booking.program,
    status: booking.status
  });

  res.status(200).json({
    status: 'success',
    message: 'Booking updated successfully',
    data: {
      booking
    }
  });
}));

// GET /api/admin/users - Get all users with filtering
router.get('/users', catchAsync(async (req, res, next) => {
  const { role, isActive, page = 1, limit = 10 } = req.query;
  
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const pagination = { page: parseInt(page), limit: parseInt(limit) };

  const users = await User.findMany(filter, pagination);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
}));

// GET /api/admin/newsletter - Get newsletter subscribers
router.get('/newsletter', catchAsync(async (req, res, next) => {
  console.log('🔍 Admin newsletter API called');
  console.log('🔍 User:', req.user);
  
  const { isActive, page = 1, limit = 10 } = req.query;
  
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const pagination = { page: parseInt(page), limit: parseInt(limit) };

  console.log('🔍 Filter:', filter);
  console.log('🔍 Pagination:', pagination);

  const result = await Newsletter.findMany(filter, pagination);
  const subscribers = result.data;
  const total = result.count;

  console.log('🔍 Subscribers found:', subscribers.length);
  console.log('🔍 Total count:', total);

  const response = {
    status: 'success',
    results: subscribers.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: {
      subscribers
    }
  };

  console.log('🔍 Sending response:', JSON.stringify(response, null, 2));
  res.status(200).json(response);
}));

// POST /api/admin/newsletter/send - Send newsletter campaign
router.post('/newsletter/send', catchAsync(async (req, res, next) => {
  const { subject, content, preferences } = req.body;
  
  if (!subject || !content) {
    return next(new AppError('Subject and content are required', 400));
  }

  // Get subscribers
  const subscribers = await SupabaseQueries.getNewsletterSubscribers(preferences);
  
  if (subscribers.length === 0) {
    return next(new AppError('No subscribers found for this campaign', 400));
  }

  // Send emails
  let sentCount = 0;
  let failedCount = 0;

  for (const subscriber of subscribers) {
    try {
      await sendEmail({
        to: subscriber.email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">${subject}</h2>
            ${content}
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              You're receiving this email because you subscribed to the Vialifecoach Global Foundation newsletter.
              <br><br>
              <a href="${process.env.FRONTEND_URL}/unsubscribe?token=${subscriber.unsubscribe_token}">Unsubscribe</a>
            </p>
          </div>
        `
      });
      sentCount++;
    } catch (error) {
      console.error(`Failed to send newsletter to ${subscriber.email}:`, error);
      failedCount++;
    }
  }

  res.status(200).json({
    status: 'success',
    message: `Newsletter campaign completed. Sent: ${sentCount}, Failed: ${failedCount}`,
    data: {
      totalRecipients: subscribers.length,
      sentCount,
      failedCount
    }
  });
}));

// GET /api/admin/stats/export - Export statistics as CSV
router.get('/stats/export', catchAsync(async (req, res, next) => {
  const { type } = req.query;
  
  let data;
  let filename;
  
  switch (type) {
    case 'bookings':
      data = await SupabaseQueries.exportData('bookings');
      filename = 'bookings.csv';
      break;
    case 'applications':
      data = await SupabaseQueries.exportData('applications');
      filename = 'applications.csv';
      break;
    case 'users':
      data = await SupabaseQueries.exportData('users');
      filename = 'users.csv';
      break;
    default:
      return next(new AppError('Invalid export type', 400));
  }

  // Convert to CSV (simplified version)
  const csv = convertToCSV(data);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}));

// GET /api/admin/feedback - Get all feedback with filtering
router.get('/feedback', catchAsync(async (req, res, next) => {
  const { status, type, page = 1, limit = 100 } = req.query;
  
  let query = supabase.from('feedback').select('*');
  
  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);
  
  // Sorting
  query = query.order('created_at', { ascending: false });
  
  const { data: feedbackRows, error } = await query;
  
  if (error) throw error;

  let contactQuery = supabaseAdmin
    .from('contact_messages')
    .select('*', { count: 'exact' });

  if (status) contactQuery = contactQuery.eq('status', status);
  if (!type || type === 'contact') contactQuery = contactQuery.order('created_at', { ascending: false });
  else contactQuery = contactQuery.limit(0);

  const { data: contactRows, error: contactError } = await contactQuery;
  if (contactError && contactError.code !== '42P01') throw contactError;

  const normalizedContacts = (contactRows || []).map((contact) => ({
    ...contact,
    type: 'contact',
    user_name: contact.name,
    user_email: contact.email,
    source: 'contact_messages'
  }));

  const allRows = [...(feedbackRows || []), ...normalizedContacts]
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.max(parseInt(limit, 10) || 100, 1);
  const from = (pageNumber - 1) * limitNumber;
  const feedback = allRows.slice(from, from + limitNumber);
  const total = allRows.length;

  res.status(200).json({
    status: 'success',
    results: feedback.length,
    total,
    pages: Math.ceil(total / limitNumber),
    currentPage: pageNumber,
    data: {
      feedback
    }
  });
}));

// POST /api/admin/feedback/:id/read - Mark feedback as read
router.post('/feedback/:id/read', catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  let { data, error } = await supabase
    .from('feedback')
    .update({ 
      status: 'read',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;

  if (!data) {
    const contactUpdate = await supabaseAdmin
      .from('contact_messages')
      .update({ status: 'read' })
      .eq('id', id)
      .select()
      .maybeSingle();

    data = contactUpdate.data;
    error = contactUpdate.error;
    if (error) throw error;
  }
  
  if (!data) {
    return next(new AppError('Feedback not found', 404));
  }

  emitAdminEvent('feedback.read', {
    id: data?.id,
    type: data?.type,
    status: data?.status
  });

  res.status(200).json({
    status: 'success',
    message: 'Feedback marked as read',
    data
  });
}));

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

module.exports = router;
