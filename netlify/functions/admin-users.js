const { json, isAdmin, identityAdminFetch } = require('./_utils');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') return json(405, { error: '지원하지 않는 방식이에요' });
  if (!isAdmin(context)) return json(403, { error: '관리자만 가능해요' });

  try {
    const res = await identityAdminFetch(context, '/admin/users?per_page=200');
    if (!res.ok) {
      const text = await res.text();
      return json(res.status, { error: 'Identity 조회 실패', detail: text });
    }
    const data = await res.json();
    const users = (data.users || data || []).map((u) => ({
      email: u.email,
      created_at: u.created_at,
      confirmed_at: u.confirmed_at,
      roles: (u.app_metadata && u.app_metadata.roles) || [],
    }));
    return json(200, { users });
  } catch (e) {
    return json(500, { error: '서버 오류', detail: String(e) });
  }
};
