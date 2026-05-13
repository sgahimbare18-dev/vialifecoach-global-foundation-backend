const { supabase } = require('../utils/supabase');

class Application {
  static async create(applicationData) {
    const { data, error } = await supabase
      .from('applications')
      .insert([applicationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        reviewed_by:users(name, email)
      `)
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findMany(filter = {}, pagination = {}) {
    try {
      const page = Number.isInteger(pagination.page) && pagination.page > 0 ? pagination.page : 1;
      const limit = Number.isInteger(pagination.limit) && pagination.limit > 0 ? pagination.limit : 10;
      
      console.log('Application.findMany called with:', {
        filter,
        pagination: { page, limit },
        sortBy: filter.sortBy || 'created_at',
        sortOrder: filter.sortOrder || 'desc'
      });

      let query = supabase.from('applications').select('*', { count: 'exact' });
      
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.type) query = query.eq('type', filter.type);
      if (filter.email) query = query.eq('email', filter.email);
      
      if (filter.sortBy) {
        query = query.order(filter.sortBy, { ascending: filter.sortOrder !== 'desc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Application findMany error:', {
          filter,
          pagination: { page, limit },
          error
        });
        throw error;
      }
      
      const normalizedData = Array.isArray(data) ? data : [];
      const normalizedCount = typeof count === 'number' ? count : normalizedData.length;
      
      console.log('Application findMany result:', {
        resultCount: normalizedData.length,
        totalCount: normalizedCount,
        hasData: normalizedData.length > 0
      });
      
      return { data: normalizedData, count: normalizedCount };
    } catch (error) {
      console.error('Application findMany catch error:', error);
      throw error;
    }
  }

  static async countDocuments(filter = {}) {
    let query = supabase.from('applications').select('id', { count: 'exact', head: true });
    
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.type) query = query.eq('type', filter.type);
    
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async updateById(id, updateData) {
    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        reviewed_by:users(name, email)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteById(id) {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async getStats() {
    const { data, error } = await supabase
      .from('applications')
      .select('type')
      .then(result => {
        const types = {};
        result.data.forEach(app => {
          types[app.type] = (types[app.type] || 0) + 1;
        });
        return Object.entries(types).map(([type, count]) => ({ _id: type, count }));
      });
    
    return data || [];
  }
}

module.exports = Application;
