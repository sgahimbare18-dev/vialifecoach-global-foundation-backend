const { supabase } = require('../utils/supabase');
const bcrypt = require('bcryptjs');

class User {
  static normalizeUser(data) {
    if (!data) return data;

    const normalized = { ...data };

    // Keep legacy callers working while storing the hash in the correct column.
    if (normalized.password_hash && !normalized.password) {
      normalized.password = normalized.password_hash;
    }

    // Never expose the stored hash directly to callers.
    delete normalized.password_hash;
    return normalized;
  }

  static async create(userData) {
    const payload = { ...userData };
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 12);
    }

    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select()
      .single();
    
    if (error) throw error;
    return User.normalizeUser(data);
  }

  static async findOne(query) {
    let supabaseQuery = supabase.from('users').select('*');

    if (!query || typeof query !== 'object') {
      const { data, error } = await supabaseQuery.single();
      if (error && error.code !== 'PGRST116') throw error;
      return User.normalizeUser(data);
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (key === 'email') {
        supabaseQuery = supabaseQuery.eq('email', value);
      } else if (key === '_id') {
        supabaseQuery = supabaseQuery.eq('id', value);
      } else {
        supabaseQuery = supabaseQuery.eq(key, value);
      }
    }

    const { data, error } = await supabaseQuery.single();
    if (error && error.code !== 'PGRST116') throw error;
    return User.normalizeUser(data);
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return User.normalizeUser(data);
  }

  static async findMany(filter = {}) {
    let query = supabase.from('users').select('*');
    
    if (filter.role) query = query.eq('role', filter.role);
    if (filter.isActive !== undefined) query = query.eq('is_active', filter.isActive);
    
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data.map((user) => User.normalizeUser(user)) : data;
  }

  static async countDocuments(filter = {}) {
    let query = supabase.from('users').select('id', { count: 'exact', head: true });
    
    if (filter.isActive !== undefined) query = query.eq('is_active', filter.isActive);
    
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async updateById(id, updateData) {
    const payload = { ...updateData };
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 12);
    }

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return User.normalizeUser(data);
  }

  static async deleteById(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    if (!hashedPassword) return false;
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  async updateLastLogin() {
    const { data, error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', this.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

module.exports = User;
