// Protege TODO o site com HTTP Basic Auth antes de qualquer HTML/CSS/JS ser entregue.
// Roda no edge da Cloudflare (Pages Functions) — não é uma verificação em JavaScript do
// navegador, então não pode ser burlada abrindo o "Ver código-fonte" da página.
//
// Usuário e senha ficam configurados como variáveis de ambiente no painel da Cloudflare
// (Pages > Settings > Environment variables), nunca aqui no código-fonte.
export async function onRequest(context) {
    const { request, env } = context;
    // Teclados mobile (Android em especial) costumam autocapitalizar a primeira letra do
    // campo de usuário no prompt nativo de Basic Auth, e às vezes deixam um espaço a mais no
    // fim — invisível para quem digitou. Usuário é comparado sem diferenciar maiúsculas/
    // minúsculas e sem espaços nas pontas; senha só tem os espaços nas pontas removidos,
    // mantendo distinção de maiúsculas/minúsculas.
    const expectedUser = (env.BASIC_AUTH_USER || '').trim().toLowerCase();
    const expectedPass = (env.BASIC_AUTH_PASS || '').trim();

    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Basic ')) {
        const decoded = atob(authHeader.slice(6));
        const separatorIndex = decoded.indexOf(':');
        const user = decoded.slice(0, separatorIndex).trim().toLowerCase();
        const pass = decoded.slice(separatorIndex + 1).trim();
        if (user === expectedUser && pass === expectedPass) {
            return context.next();
        }
    }

    return new Response('Autenticação necessária.', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Painel CIJUN", charset="UTF-8"' }
    });
}
