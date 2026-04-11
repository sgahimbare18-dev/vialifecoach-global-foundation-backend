const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Application = require('../models/Application');
const Newsletter = require('../models/Newsletter');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vialifecoach', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Application.deleteMany({});
    await Newsletter.deleteMany({});

    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@vialifecoach.org',
      password: adminPassword,
      role: 'admin',
      isActive: true
    });

    // Create mentor users
    const mentorPassword = await bcrypt.hash('Mentor123!', 12);
    const mentor1 = await User.create({
      name: 'Sarah Johnson',
      email: 'sarah@vialifecoach.org',
      password: mentorPassword,
      role: 'mentor',
      phone: '+1234567890',
      bio: 'Experienced life coach with 10+ years of experience in personal development and career guidance.',
      isActive: true
    });

    const mentor2 = await User.create({
      name: 'Michael Chen',
      email: 'michael@vialifecoach.org',
      password: mentorPassword,
      role: 'mentor',
      phone: '+1234567891',
      bio: 'Career development specialist helping professionals achieve their goals through strategic planning and skill development.',
      isActive: true
    });

    // Create sample bookings
    const bookings = [
      {
        program: 'Life Coaching',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        preferredDate: new Date('2024-01-15'),
        preferredTime: 'Morning (9AM-12PM)',
        message: 'Looking for guidance in career transition',
        status: 'confirmed',
        assignedMentor: mentor1._id
      },
      {
        program: 'Career Development',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567891',
        preferredDate: new Date('2024-01-16'),
        preferredTime: 'Afternoon (12PM-5PM)',
        message: 'Need help with resume building and interview preparation',
        status: 'pending'
      },
      {
        program: 'Leadership Training',
        name: 'Robert Johnson',
        email: 'robert@example.com',
        phone: '+1234567892',
        preferredDate: new Date('2024-01-17'),
        preferredTime: 'Evening (5PM-8PM)',
        message: 'Want to improve leadership skills for management role',
        status: 'completed',
        assignedMentor: mentor2._id,
        sessionNotes: 'Completed initial leadership assessment. Good progress made.'
      }
    ];

    await Booking.insertMany(bookings);

    // Create sample applications
    const applications = [
      {
        name: 'Alice Williams',
        email: 'alice@example.com',
        phone: '+1234567893',
        age: 28,
        location: 'New York, USA',
        motivation: 'I want to give back to the community by sharing my experience in education and mentoring young professionals.',
        experience: '5 years of teaching experience and 2 years of mentoring at local community center.',
        availability: 'Weekends only',
        skills: 'Teaching, mentoring, public speaking, curriculum development',
        type: 'volunteer',
        status: 'approved',
        reviewedBy: adminUser._id,
        reviewedAt: new Date()
      },
      {
        name: 'David Brown',
        email: 'david@example.com',
        phone: '+1234567894',
        age: 35,
        location: 'Los Angeles, USA',
        motivation: 'Interested in becoming a certified life coach to help people achieve their personal and professional goals.',
        experience: '10 years in corporate HR and employee development.',
        availability: 'Flexible',
        skills: 'HR management, employee training, conflict resolution, performance coaching',
        type: 'mentor',
        status: 'under_review'
      },
      {
        name: 'TechCorp Solutions',
        email: 'partnerships@techcorp.com',
        phone: '+1234567895',
        age: null, // Not applicable for organizations
        location: 'San Francisco, USA',
        motivation: 'We want to partner with Vialifecoach to provide technology mentorship programs for underserved communities.',
        experience: 'Leading technology company with expertise in software development, AI, and digital transformation.',
        availability: 'Full-time',
        skills: 'Technology mentorship, software development, digital literacy programs',
        type: 'partner',
        status: 'interview_scheduled',
        interviewDate: new Date('2024-01-20'),
        interviewNotes: 'Initial discussion scheduled to explore partnership opportunities.'
      }
    ];

    await Application.insertMany(applications);

    // Create sample newsletter subscribers
    const subscribers = [
      {
        email: 'newsletter1@example.com',
        name: 'Subscriber One',
        preferences: 'all',
        isActive: true,
        unsubscribeToken: require('crypto').randomBytes(32).toString('hex')
      },
      {
        email: 'newsletter2@example.com',
        name: 'Subscriber Two',
        preferences: 'events',
        isActive: true,
        unsubscribeToken: require('crypto').randomBytes(32).toString('hex')
      },
      {
        email: 'newsletter3@example.com',
        name: 'Subscriber Three',
        preferences: 'newsletter',
        isActive: true,
        unsubscribeToken: require('crypto').randomBytes(32).toString('hex')
      }
    ];

    await Newsletter.insertMany(subscribers);

    console.log('Sample data seeded successfully!');
    console.log('\nCreated accounts:');
    console.log('Admin: admin@vialifecoach.org / Admin123!');
    console.log('Mentor 1: sarah@vialifecoach.org / Mentor123!');
    console.log('Mentor 2: michael@vialifecoach.org / Mentor123!');
    
    console.log('\nSample data created:');
    console.log(`- ${bookings.length} bookings`);
    console.log(`- ${applications.length} applications`);
    console.log(`- ${subscribers.length} newsletter subscribers`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Run seed function
seedData();
