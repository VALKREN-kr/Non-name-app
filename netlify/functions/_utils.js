const { getStore } = require('@netlify/blobs');

function store() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: 'nnm-data', siteID, token });
  }
  // 환경변수가 아직 없으면 자동 인식 방식으로 시도 (플랫폼에 따라 실패할 수 있음)
  return getStore('nnm-data');
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function currentUser(context) {
  return (context && context.clientContext && context.clientContext.user) || null;
}

function isAdmin(context) {
  const user = currentUser(context);
  const roles = user && user.app_metadata && user.app_metadata.roles;
  return !!(roles && Array.isArray(roles) && roles.includes('admin'));
}

async function identityAdminFetch(context, path, opts) {
  const identity = context.clientContext && context.clientContext.identity;
  if (!identity) throw new Error('Identity context missing');
  const res = await fetch(identity.url + path, {
    ...(opts || {}),
    headers: {
      ...((opts && opts.headers) || {}),
      Authorization: 'Bearer ' + identity.token,
    },
  });
  return res;
}

module.exports = { store, json, currentUser, isAdmin, identityAdminFetch };
