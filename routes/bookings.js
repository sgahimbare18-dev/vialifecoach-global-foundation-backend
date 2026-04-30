const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { emitAdminEvent } = require('../utils/realtime');

// Create a new booking
router.post('/create', async (req, res) => {
  try {
    const { program, name, email, phone, preferred_date, preferred_time, message } = req.body;
    
    // Validate required fields
    if (!program || !name || !email || !preferred_date || !preferred_time) {
      return res.status(400).json({ 
        error: 'Missing required fields: program, name, email, preferred_date, preferred_time' 
      });
    }
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          program,
          name,
          email,
          phone,
          preferred_date,
          preferred_time,
          message,
          status: 'pending'
        }
      ])
      .select();
    
    if (error) {
      throw error;
    }
    
    emitAdminEvent('booking.created', {
      id: data[0]?.id,
      program: data[0]?.program,
      status: data[0]?.status
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: data[0]
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all bookings (admin only - you can add auth later)
router.get('/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      bookings: data
    });
    
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    res.json({
      success: true,
      booking: data
    });
    
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update booking status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status, 
        updated_at: new Date() 
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    emitAdminEvent('booking.updated', {
      id: data[0]?.id,
      program: data[0]?.program,
      status: data[0]?.status
    });

    res.json({
      success: true,
      message: 'Booking status updated',
      booking: data[0]
    });
    
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;