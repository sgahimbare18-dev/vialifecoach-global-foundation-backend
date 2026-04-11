const { supabase } = require('../utils/supabase');
const crypto = require('crypto');

class Newsletter {
  static async create(subscriberData) {
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    const { data, error } = await supabase
      .from('newsletter')
      .insert([{ ...subscriberData, unsubscribe_token: unsubscribeToken }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findOne(query) {
    let supabaseQuery = supabase.from('newsletter').select('*');
    
    if (query.email) {
      supabaseQuery = supabaseQuery.eq('email', query.email);
    }
    if (query.unsubscribeToken) {
      supabaseQuery = supabaseQuery.eq('unsubscribe_token', query.unsubscribeToken);
    }
    
    const { data, error } = await supabaseQuery.single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findMany(filter = {}, pagination = {}) {
    let query = supabase.from('newsletter').select('*');
    
    if (filter.isActive !== undefined) query = query.eq('is_active', filter.isActive);
    if (filter.preferences) query = query.eq('preferences', filter.preferences);
    
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
      query = query.order('subscribed_at', { ascending: false });
    }
    
    const { data, error, count } = await query;
    if (error) throw error;
    
    return { data, count };
  }

  static async countDocuments(filter = {}) {
    let query = supabase.from('newsletter').select('id', { count: 'exact', head: true });
    
    if (filter.isActive !== undefined) query = query.eq('is_active', filter.isActive);
    if (filter.preferences) query = query.eq('preferences', filter.preferences);
    
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async updateById(id, updateData) {
    const { data, error } = await supabase
      .from('newsletter')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateByEmail(email, updateData) {
    const { data, error } = await supabase
      .from('newsletter')
      .update(updateData)
      .eq('email', email)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteById(id) {
    const { error } = await supabase
      .from('newsletter')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async unsubscribe(token) {
    const { error } = await supabase
      .from('newsletter')
      .update({ is_active: false })
      .eq('unsubscribe_token', token);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Newsletter;
