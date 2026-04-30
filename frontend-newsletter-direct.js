// Frontend Direct Supabase Connection for Newsletter
// Add this to your admin dashboard HTML to directly connect to Supabase

// 1. Add Supabase CDN to your HTML head
/*
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
*/

// 2. Initialize Supabase client
const { createClient } = supabase;

const supabaseClient = createClient(
  'https://cgxjqfjupscdrynazloy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxZmp1cHNjZHJ5bmF6bG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzA3NjEsImV4cCI6MjA5MDgwNjc2MX0.ccu92rWi1YDraYmrO3jFfgxxBw1Bs0XtgzIf5Pko7iA'
);

// 3. Direct newsletter functions
async function getNewsletterSubscribers() {
  try {
    console.log('🔍 Fetching newsletter subscribers directly from Supabase...');
    
    const { data, error } = await supabaseClient
      .from('newsletter')
      .select('*')
      .order('subscribed_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log('✅ Subscribers fetched:', data?.length || 0);
    console.log('📊 Data:', data);
    
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching subscribers:', error);
    return [];
  }
}

async function getNewsletterStats() {
  try {
    const { data, error } = await supabaseClient
      .from('newsletter')
      .select('id', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return {
      total: data?.length || 0,
      active: data?.filter(sub => sub.is_active).length || 0
    };
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    return { total: 0, active: 0 };
  }
}

// 4. Display functions for admin dashboard
function displaySubscribers(subscribers) {
  const container = document.querySelector('.newsletter-subscribers-container');
  if (!container) {
    console.error('❌ Newsletter container not found');
    return;
  }
  
  if (subscribers.length === 0) {
    container.innerHTML = `
      <div class="no-subscribers">
        <p>No subscribers found.</p>
      </div>
    `;
    return;
  }
  
  const html = subscribers.map(sub => `
    <tr>
      <td>${sub.email}</td>
      <td>${new Date(sub.subscribed_at).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="unsubscribeSubscriber('${sub.id}')">
          Unsubscribe
        </button>
      </td>
    </tr>
  `).join('');
  
  container.innerHTML = `
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Email</th>
          <th>Subscribed Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${html}
      </tbody>
    </table>
  `;
}

async function unsubscribeSubscriber(subscriberId) {
  try {
    const { error } = await supabaseClient
      .from('newsletter')
      .update({ 
        is_active: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('id', subscriberId);
    
    if (error) throw error;
    
    console.log('✅ Subscriber unsubscribed successfully');
    // Refresh the list
    loadNewsletterData();
  } catch (error) {
    console.error('❌ Error unsubscribing:', error);
    alert('Error unsubscribing subscriber');
  }
}

// 5. Main load function
async function loadNewsletterData() {
  console.log('🚀 Loading newsletter data...');
  
  try {
    // Show loading state
    const container = document.querySelector('.newsletter-subscribers-container');
    if (container) {
      container.innerHTML = '<p>Loading subscribers...</p>';
    }
    
    // Fetch data
    const subscribers = await getNewsletterSubscribers();
    const stats = await getNewsletterStats();
    
    // Display stats
    const statsElement = document.querySelector('.newsletter-stats');
    if (statsElement) {
      statsElement.innerHTML = `
        <div class="stat-card">
          <h3>${stats.total}</h3>
          <p>Total Subscribers</p>
        </div>
        <div class="stat-card">
          <h3>${stats.active}</h3>
          <p>Active Subscribers</p>
        </div>
      `;
    }
    
    // Display subscribers
    displaySubscribers(subscribers);
    
  } catch (error) {
    console.error('❌ Error loading newsletter data:', error);
    const container = document.querySelector('.newsletter-subscribers-container');
    if (container) {
      container.innerHTML = '<p>Error loading subscribers. Please try again.</p>';
    }
  }
}

// 6. Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 Page loaded, checking for newsletter section...');
  
  // Check if we're on the newsletter page
  if (window.location.pathname.includes('newsletter') || 
      document.querySelector('.newsletter-subscribers-container')) {
    console.log('🎯 Newsletter section detected, loading data...');
    loadNewsletterData();
  }
});

// 7. Export functions for global use
window.getNewsletterSubscribers = getNewsletterSubscribers;
window.loadNewsletterData = loadNewsletterData;
window.unsubscribeSubscriber = unsubscribeSubscriber;

// 8. Auto-refresh every 30 seconds
setInterval(() => {
  if (document.querySelector('.newsletter-subscribers-container')) {
    loadNewsletterData();
  }
}, 30000);
