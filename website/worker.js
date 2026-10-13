// The site moved from shadertab.simonwong.cn to shadertab.moonunder.app.
// Requests to the old host get a permanent redirect that keeps the path and query.
const LEGACY_HOST = 'shadertab.simonwong.cn';
const CANONICAL_ORIGIN = 'https://shadertab.moonunder.app';

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === LEGACY_HOST)
      return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, 301);
    return env.ASSETS.fetch(request);
  },
};
