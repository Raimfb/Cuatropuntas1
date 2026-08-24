export default async function middleware(request) {
  const url = new URL(request.url);
  const accept = request.headers.get('accept') || '';

  // Negociar Markdown cuando se solicita text/markdown en páginas principales
  if (accept.includes('text/markdown') && !url.pathname.startsWith('/api') && (!url.pathname.includes('.') || url.pathname.endsWith('.html'))) {
    const page = url.pathname === '/' ? 'index' : url.pathname.replace(/^\//, '').replace(/\.html$/, '');
    const markdownUrl = new URL(`/api/markdown?page=${encodeURIComponent(page)}`, request.url);
    const mdResponse = await fetch(markdownUrl);
    const mdText = await mdResponse.text();
    
    return new Response(mdText, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'x-markdown-tokens': Math.ceil(mdText.length / 4).toString(),
        'Access-Control-Allow-Origin': '*',
        'Link': '</llms.txt>; rel="describedby"; type="text/markdown", </.well-known/api-catalog>; rel="api-catalog", </.well-known/mcp/server-card.json>; rel="service-desc", </.well-known/agent-card.json>; rel="describedby"'
      }
    });
  }
}
