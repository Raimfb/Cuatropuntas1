// api/oauth-protected-resource.js - RFC 9728 OAuth 2.0 Protected Resource Metadata
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return res.status(200).json({
    resource: "https://www.cuatropuntas.com",
    authorization_servers: [
      "https://www.cuatropuntas.com"
    ],
    scopes_supported: [
      "read",
      "quote",
      "public"
    ],
    bearer_methods_supported: [
      "header"
    ]
  });
};
