const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name, preferences } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if already subscribed
    const { data: existing, error: checkError } = await supabase
      .from('newsletter')
      .select('email')
      .eq('email', email)
      .single();
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already subscribed' 
      });
    }
    
    // Insert new subscriber
    const { data, error } = await supabase
      .from('newsletter')
      .insert([
        {
          email,
          name: name || null,
          preferences: preferences || 'all',
          is_active: true,
          subscribed_at: new Date()
        }
      ])
      .select();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      subscriber: data[0]
    });
    
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const { data, error } = await supabase
      .from('newsletter')
      .update({ 
        is_active: false,
        unsubscribed_at: new Date()
      })
      .eq('email', email)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Email not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });
    
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all subscribers (admin only)
router.get('/subscribers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('newsletter')
      .select('*')
      .order('subscribed_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      subscribers: data
    });
    
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;