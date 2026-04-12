const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');
const { catchAsync, AppError } = require('../utils/errorHandler');

const router = express.Router();

// GET /api/feedback - Get all feedback with filtering (requires authentication)
router.get('/', authenticateToken, catchAsync(async (req, res, next) => {
    const { status, type, page = 1, limit = 100 } = req.query;
    
    let query = supabase.from('feedback').select('*');
    
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    
    // Pagination
    if (page && limit) {
        const from = (parseInt(page) - 1) * parseInt(limit);
        const to = from + parseInt(limit) - 1;
        query = query.range(from, to);
    }
    
    // Sorting
    query = query.order('created_at', { ascending: false });
    
    const { data: feedback, error, count } = await query;
    
    if (error) throw error;
    
    res.status(200).json({
        success: true,
        results: feedback.length,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        currentPage: parseInt(page),
        data: {
            feedback
        }
    });
}));

// POST /api/feedback - Create new feedback
router.post('/', catchAsync(async (req, res, next) => {
    const { type, subject, message, user_name, user_email } = req.body;
    
    if (!type || !message || !user_name || !user_email) {
        return next(new AppError('Type, message, user name, and user email are required', 400));
    }
    
    const { data, error } = await supabase
        .from('feedback')
        .insert([{
            type,
            subject,
            message,
            user_name,
            user_email,
            status: 'pending'
        }])
        .select();
    
    if (error) throw error;
    
    res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: data[0]
    });
}));

// PUT /api/feedback/:id/read - Mark feedback as read
router.put('/:id/read', catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    const { data, error } = await supabase
        .from('feedback')
        .update({ 
            status: 'read',
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    
    if (!data) {
        return next(new AppError('Feedback not found', 404));
    }
    
    res.status(200).json({
        success: true,
        message: 'Feedback marked as read',
        data
    });
}));

module.exports = router;
