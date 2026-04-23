// CodeValue Admin API - Secure endpoint for price management
export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {

    const { price, source = 'admin', note } = req.body;

    // Validate input
    if (!price || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        error: 'Invalid price',
        message: 'Price must be a positive number'
      });
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Supabase configuration missing'
      });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Call the set_code_price function
    const { data, error } = await supabase.rpc('set_code_price', {
      p_price: price,
      p_source: source,
      p_note: note,
      p_by: null // Will be set by the function if needed
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(500).json({
        error: 'Database error',
        message: error.message
      });
    }

    console.log(`💰 Code price updated: ${price} (source: ${source})`);

    res.json({
      success: true,
      message: 'Code price updated successfully',
      data: data[0] || data, // RPC returns array
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin set-code-price error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}