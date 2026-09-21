module.exports = function handler(request, response) {
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  };

  response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).send(`window.MYSPACE_CONFIG = ${JSON.stringify(config)};`);
};
