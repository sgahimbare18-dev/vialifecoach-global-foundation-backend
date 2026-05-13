const cors = require('cors');

// Allowed frontend domains
const allowedOrigins = [
  'https://vialifecoach.org',
  'https://www.vialifecoach.org',
  'https://academy.vialifecoach.org'
];

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {

    // Allow requests with no origin
    // (Postman, mobile apps, server-to-server requests)
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost during development
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    // Allow production frontend domains
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log blocked origins for debugging
    console.log('❌ Blocked by CORS:', origin);

    // Reject unknown origins WITHOUT crashing
    return callback(null, false);
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-id'
  ]
}));