const { supabase } = require('../utils/supabase');

class Feedback {
    static async create(feedbackData) {
        const { data, error } = await supabase
            .from('feedback')
            .insert([feedbackData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    static async findById(id) {
        const { data, error } = await supabase
            .from('feedback')
            .select(`
                *,
                user:users(name, email)
            `)
            .eq('id', id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async findMany(filter = {}, pagination = {}) {
        let query = supabase.from('feedback').select(`
            *,
            user:users(name, email)
        `);
        
        if (filter.status) query = query.eq('status', filter.status);
        if (filter.type) query = query.eq('type', filter.type);
        if (filter.userId) query = query.eq('user_id', filter.userId);
        
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

    static async update(id, updateData) {
        const { data, error } = await supabase
            .from('feedback')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    static async countDocuments(filter = {}) {
        let query = supabase.from('feedback').select('id', { count: 'exact', head: true });
        
        if (filter.status) query = query.eq('status', filter.status);
        if (filter.type) query = query.eq('type', filter.type);
        
        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    }

    static async getStats() {
        const { data, error } = await supabase
            .from('feedback')
            .select('type')
            .then(result => {
                const types = {};
                result.data.forEach(feedback => {
                    types[feedback.type] = (types[feedback.type] || 0) + 1;
                });
                return Object.entries(types).map(([type, count]) => ({ _id: type, count }));
            });
        
        return data || [];
    }
}

module.exports = Feedback;
