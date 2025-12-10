/*
 * Filename: js/core/supabaseClient.js
 * Version: 2.0.0
 * Description: Initializes and exports the Supabase client instance.
 * Acts as the single source of truth for DB connections.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from '../config/supabase.js';

// Create a single instance
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);