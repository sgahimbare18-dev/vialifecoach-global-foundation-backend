const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
const SupabaseQueries = require('./utils/supabaseQueries');

(async () => {
  try {
    const stats = await SupabaseQueries.getDashboardStats();
    console.log('stats', JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('stats failed', err.message);
  }

  try {
    const bookings = await SupabaseQueries.getBookingsByProgram();
    console.log('bookings', JSON.stringify(bookings, null, 2));
  } catch (err) {
    console.error('bookings failed', err.message);
  }

  try {
    const apps = await SupabaseQueries.getApplicationsByType();
    console.log('apps', JSON.stringify(apps, null, 2));
  } catch (err) {
    console.error('apps failed', err.message);
  }

  try {
    const recent = await SupabaseQueries.getRecentActivity();
    console.log('recent', JSON.stringify(recent, null, 2));
  } catch (err) {
    console.error('recent failed', err.message);
  }
})();
