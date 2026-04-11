const { supabase } = require('../utils/supabase');

class Booking {
  static async create(bookingData) {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        assigned_mentor:users(name, email)
      `)
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findMany(filter = {}, pagination = {}) {
    let query = supabase.from('bookings').select(`
      *,
      assigned_mentor:users(name, email)
    `);
    
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.program) query = query.eq('program', filter.program);
    if (filter.email) query = query.eq('email', filter.email);
    
    // Pagination
    if (pagination.page && pagination.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }
    
    // Sorting
    if (filter.sortBy) {
      query = query.order(filter.sortBy, { ascending: filter.sortOrder !== 'desc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    const { data, error, count } = await query;
    if (error) throw error;
    
    return { data, count };
  }

  static async countDocuments(filter = {}) {
    let query = supabase.from('bookings').select('id', { count: 'exact', head: true });
    
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.program) query = query.eq('program', filter.program);
    
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async updateById(id, updateData) {
    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assigned_mentor:users(name, email)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteById(id) {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async getStats() {
    const { data, error } = await supabase
      .from('bookings')
      .select('program')
      .then(result => {
        const programs = {};
        result.data.forEach(booking => {
          programs[booking.program] = (programs[booking.program] || 0) + 1;
        });
        return Object.entries(programs).map(([program, count]) => ({ _id: program, count }));
      });
    
    return data || [];
  }
}

module.exports = Booking;
