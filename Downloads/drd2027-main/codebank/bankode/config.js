// Bankode Configuration
// This file sets up the global configuration for the Bankode application

window.BANKODE_ENV = {
  API_BASE: 'https://obmufgumrrxjvgjquqro.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXVmZ3VtcnJ4anZnanF1cXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2NzY0MTUsImV4cCI6MjA1MzI1MjQxNX0.wUKntErBvsfTgX5FJZ45TdC697Hg63rgkQcI5P-3SpQ',
  SUPABASE_URL: 'https://obmufgumrrxjvgjquqro.supabase.co'
};

// Also set for Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BANKODE_ENV: window.BANKODE_ENV
  };
}