const { supabase } = require('../utils/supabase');

class Donation {
  static async create(donationData) {
    const { data, error } = await supabase
      .from('donations')
      .insert([donationData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByReference(reference) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('provider_reference', reference)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updateById(id, updateData) {
    const payload = { ...updateData, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('donations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateByReference(reference, updateData) {
    const payload = { ...updateData, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('donations')
      .update(payload)
      .eq('provider_reference', reference)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findMany(filter = {}, pagination = {}) {
    let query = supabase
      .from('donations')
      .select('*', { count: 'exact' });

    if (filter.status) query = query.eq('status', filter.status);
    if (filter.payment_method) query = query.eq('payment_method', filter.payment_method);
    if (filter.provider) query = query.eq('provider', filter.provider);
    if (filter.frequency) query = query.eq('frequency', filter.frequency);
    if (filter.email) query = query.eq('donor_email', filter.email);

    if (pagination.page && pagination.limit) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, count };
  }
}

module.exports = Donation;
