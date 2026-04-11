const { supabase } = require('./supabase');

class SupabaseQueries {
  static async getDashboardStats() {
    const [
      usersResult,
      bookingsResult,
      pendingBookingsResult,
      applicationsResult,
      pendingApplicationsResult,
      subscribersResult,
      donationsResult
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('newsletter').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('donations').select('id', { count: 'exact', head: true })
    ]);

    return {
      totalUsers: usersResult.count || 0,
      totalBookings: bookingsResult.count || 0,
      pendingBookings: pendingBookingsResult.count || 0,
      totalApplications: applicationsResult.count || 0,
      pendingApplications: pendingApplicationsResult.count || 0,
      totalSubscribers: subscribersResult.count || 0,
      totalDonations: donationsResult.count || 0
    };
  }

  static async getBookingsByProgram() {
    const { data, error } = await supabase
      .from('bookings')
      .select('program');
    
    if (error) throw error;
    
    const programs = {};
    data.forEach(booking => {
      programs[booking.program] = (programs[booking.program] || 0) + 1;
    });
    
    return Object.entries(programs).map(([program, count]) => ({ _id: program, count }));
  }

  static async getApplicationsByType() {
    const { data, error } = await supabase
      .from('applications')
      .select('type');
    
    if (error) throw error;
    
    const types = {};
    data.forEach(app => {
      types[app.type] = (types[app.type] || 0) + 1;
    });
    
    return Object.entries(types).map(([type, count]) => ({ _id: type, count }));
  }

  static async getRecentActivity() {
    const [recentBookings, recentApplications] = await Promise.all([
      supabase
        .from('bookings')
        .select('name, email, program, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('applications')
        .select('name, email, type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    return {
      bookings: recentBookings.data || [],
      applications: recentApplications.data || []
    };
  }

  static async getNewsletterSubscribers(preferences = null, isActive = true) {
    let query = supabase
      .from('newsletter')
      .select('email, name, preferences')
      .eq('is_active', isActive);
    
    if (preferences && preferences !== 'all') {
      query = query.eq('preferences', preferences);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  }

  static async exportData(table, filters = {}) {
    let query = supabase.from(table).select('*');
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    // Order by created_at desc
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  }
}

module.exports = SupabaseQueries;
