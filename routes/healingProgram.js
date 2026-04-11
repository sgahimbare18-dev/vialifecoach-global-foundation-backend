const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');

// Sacred Sounds transformation mapping
const sacredSoundsMapping = {
    "Healing Program for Depression": {
        title: "Air",
        icon: "Air",
        description: "Breathe in peace, breathe out tension. Let the gentle air element cleanse your spirit.",
        frequency: "432 Hz",
        duration: "15 min"
    },
    "Healing Program for Anxiety": {
        title: "Aura",
        icon: "Aura", 
        description: "Cleanse and strengthen your energetic field. Restore your natural radiance.",
        frequency: "528 Hz",
        duration: "18 min"
    },
    "Healing Program for Stress": {
        title: "Calm Relaxing",
        icon: "Calm",
        description: "Surrender to deep tranquility. Let soothing melodies restore inner harmony.",
        frequency: "639 Hz",
        duration: "20 min"
    },
    "Healing Program for Trauma": {
        title: "Cinematic Orchestral",
        icon: "Cinematic",
        description: "Epic and uplifting. A journey through emotions that inspires transformation.",
        frequency: "741 Hz",
        duration: "22 min"
    },
    "Healing Program for Sleep": {
        title: "Deep Relaxation",
        icon: "Deep",
        description: "Plunge into profound stillness. Experience cellular-level healing.",
        frequency: "852 Hz",
        duration: "25 min"
    },
    "Healing Program for Focus": {
        title: "Peaceful",
        icon: "Peaceful",
        description: "Wrap yourself in divine serenity. A gentle embrace for your soul.",
        frequency: "396 Hz",
        duration: "15 min"
    },
    "Healing Program for Pain": {
        title: "Recovery",
        icon: "Recovery",
        description: "Nurture your healing process. Support emotional recovery.",
        frequency: "417 Hz",
        duration: "20 min"
    },
    "Healing Program for Grief": {
        title: "Relax",
        icon: "Relax",
        description: "Simply let go. Return to your natural state of ease.",
        frequency: "285 Hz",
        duration: "12 min"
    },
    "Healing Program for Self-Esteem": {
        title: "Relaxation",
        icon: "Relaxation",
        description: "Deep meditative state. Perfect for meditation and contemplation.",
        frequency: "174 Hz",
        duration: "30 min"
    },
    "Healing Program for Addiction": {
        title: "Relaxing Ambient",
        icon: "Ambient",
        description: "Cosmic tranquility. Drift through ethereal soundscapes.",
        frequency: "963 Hz",
        duration: "28 min"
    }
};

// Transform Supabase data to Sacred Sounds format
const transformToSacredSounds = (programs) => {
    return programs.map(program => {
        const mapping = sacredSoundsMapping[program.title];
        if (mapping) {
            return {
                ...program,
                title: mapping.title,
                description: mapping.description,
                category: mapping.title.toLowerCase(),
                frequency: mapping.frequency,
                duration: mapping.duration
            };
        }
        return program; // Return original if no mapping found
    });
};

// Get all available healing programs
router.get('/programs', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('healing_programs')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transform Supabase data to Sacred Sounds format
        const transformedPrograms = transformToSacredSounds(data || []);
        
        res.json({
            success: true,
            programs: transformedPrograms
        });
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get specific program with signed audio URLs (secure - requires authentication)
router.get('/programs/:programId', async (req, res) => {
    try {
        const { programId } = req.params;
        const userId = req.query.userId || req.headers['x-user-id'];
        
        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required. Please log in to access audio content.' 
            });
        }
        
        // Get program details
        const { data: program, error: programError } = await supabase
            .from('healing_programs')
            .select('*')
            .eq('id', programId)
            .single();
        
        if (programError) throw programError;
        
        // Transform program data to Sacred Sounds format
        const transformedPrograms = transformToSacredSounds([program]);
        const transformedProgram = transformedPrograms[0] || program;
        
        // Get audio tracks for this program
        const { data: tracks, error: tracksError } = await supabase
            .from('audio_tracks')
            .select('*')
            .eq('program_id', programId)
            .eq('is_active', true)
            .order('play_order', { ascending: true });
        
        if (tracksError) throw tracksError;
        
        // Generate signed URLs for each track
        let backgroundMusic = [];
        let voiceGuidance = [];
        
        if (tracks && tracks.length > 0) {
            // Process background music tracks
            const bgTracks = tracks.filter(t => t.track_type === 'background_music');
            for (const track of bgTracks) {
                try {
                    // Generate signed URL (expires in 1 hour)
                    const { data: signedUrlData, error: signError } = await supabase
                        .storage
                        .from('program-audio')
                        .createSignedUrl(track.track_url, 3600);
                    
                    if (!signError && signedUrlData) {
                        console.log('Generated signed URL for track:', track.track_title);
                        backgroundMusic.push({
                            id: track.id,
                            track_title: track.track_title,
                            track_type: track.track_type,
                            play_order: track.play_order,
                            duration: track.duration,
                            signed_url: signedUrlData.signedUrl,
                            expires_at: new Date(Date.now() + 3600000).toISOString()
                        });
                    } else {
                        console.error('Signed URL error for track:', track.track_title, signError);
                        console.error('Track URL:', track.track_url);
                        backgroundMusic.push({
                            id: track.id,
                            track_title: track.track_title,
                            track_type: track.track_type,
                            play_order: track.play_order,
                            signed_url: null,
                            error: 'Unable to generate audio URL'
                        });
                    }
                } catch (err) {
                    console.error('Error generating signed URL for track:', err);
                    backgroundMusic.push({
                        id: track.id,
                        track_title: track.track_title,
                        track_type: track.track_type,
                        play_order: track.play_order,
                        signed_url: null,
                        error: 'Audio temporarily unavailable'
                    });
                }
            }
            
            // Process voice guidance tracks (if any)
            const vcTracks = tracks.filter(t => t.track_type === 'voice_guidance');
            for (const track of vcTracks) {
                try {
                    const { data: signedUrlData, error: signError } = await supabase
                        .storage
                        .from('program-audio')
                        .createSignedUrl(track.track_url, 3600);
                    
                    if (!signError && signedUrlData) {
                        voiceGuidance.push({
                            id: track.id,
                            track_title: track.track_title,
                            track_type: track.track_type,
                            play_order: track.play_order,
                            signed_url: signedUrlData.signedUrl,
                            expires_at: new Date(Date.now() + 3600000).toISOString()
                        });
                    }
                } catch (err) {
                    console.error('Error generating signed URL for voice track:', err);
                }
            }
        }
        
        res.json({
            success: true,
            program: {
                id: transformedProgram.id,
                title: transformedProgram.title,
                description: transformedProgram.description,
                category: transformedProgram.category,
                duration: transformedProgram.duration,
                thumbnail_url: program.thumbnail_url
            },
            audio: {
                background_music: backgroundMusic,
                voice_guidance: voiceGuidance
            }
        });
    } catch (error) {
        console.error('Error fetching program:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Start a program session
router.post('/programs/:programId/start', async (req, res) => {
    try {
        const { programId } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        // Get or create user progress
        const { data: existingProgress } = await supabase
            .from('user_program_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('program_id', programId)
            .single();
        
        if (!existingProgress) {
            const { data: newProgress, error } = await supabase
                .from('user_program_progress')
                .insert({
                    user_id: userId,
                    program_id: programId,
                    status: 'in_progress',
                    started_at: new Date(),
                    last_played_at: new Date()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            res.json({
                success: true,
                message: 'Program started',
                progress: newProgress
            });
        } else {
            const { data: updated, error } = await supabase
                .from('user_program_progress')
                .update({ last_played_at: new Date() })
                .eq('id', existingProgress.id)
                .select()
                .single();
            
            if (error) throw error;
            
            res.json({
                success: true,
                message: 'Program resumed',
                progress: updated
            });
        }
    } catch (error) {
        console.error('Error starting program:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Track audio session completion
router.post('/track-session', async (req, res) => {
    try {
        const { userId, programId, trackId, duration, completed } = req.body;
        
        if (!userId || !programId || !trackId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        const { data, error } = await supabase
            .from('user_audio_sessions')
            .insert({
                user_id: userId,
                program_id: programId,
                track_id: trackId,
                session_duration: duration || 0,
                completed: completed || false
            });
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Session tracked successfully'
        });
    } catch (error) {
        console.error('Error tracking session:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get user's program progress
router.get('/my-progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const { data, error } = await supabase
            .from('user_program_progress')
            .select(`
                *,
                healing_programs (
                    title,
                    description,
                    category
                )
            `)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({
            success: true,
            progress: data || []
        });
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;