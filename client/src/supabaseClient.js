/**
 * CampusVenue Supabase Client Helper
 * Allows direct fetching and interaction with the connected Supabase cloud database.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ywndgjozzazviekcvwse.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bmRnam96emF6dmlla2N2d3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxNTA5MTMsImV4cCI6MjExMDcyNjkxM30.zvJpEG43bX1qVx0WdVw5hf7GKwb6GjbOLRqtJKCTZfs';

export async function fetchFromSupabase(table, options = {}) {
  const query = options.query ? `?${options.query}` : '?select=*';
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with status ${response.status}`);
  }

  return response.json();
}

export default {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  fetchTable: fetchFromSupabase
};
