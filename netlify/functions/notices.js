const { store, json, isAdmin } = require('./_utils');

const KEY = 'notices';

exports.handler = async (event, context) => {
  try {
    const s = store();

    if (event.httpMethod === 'GET') {
      const notices = (await s.get(KEY, { type: 'json' })) || [];
      notices.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return json(200, { notices });
    }

    if (event.httpMethod === 'POST') {
      if (!isAdmin(context)) return json(403, { error: '관리자만 가능해요' });

      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return json(400, { error: '잘못된 요청이에요' });
      }

      const notices = (await s.get(KEY, { type: 'json' })) || [];

      if (body.action === 'add') {
        if (!body.title) return json(400, { error: '제목이 필요해요' });
        notices.push({
          id: Date.now().toString(36),
          title: body.title,
          body: body.body || '',
          date: new Date().toISOString(),
        });
      } else if (body.action === 'update') {
        const idx = notices.findIndex((n) => n.id === body.id);
        if (idx === -1) return json(404, { error: '공지를 못 찾았어요' });
        notices[idx] = { ...notices[idx], title: body.title, body: body.body };
      } else if (body.action === 'delete') {
        const idx = notices.findIndex((n) => n.id === body.id);
        if (idx === -1) return json(404, { error: '공지를 못 찾았어요' });
        notices.splice(idx, 1);
      } else {
        return json(400, { error: '알 수 없는 동작이에요' });
      }

      await s.setJSON(KEY, notices);
      return json(200, { notices });
    }

    return json(405, { error: '지원하지 않는 방식이에요' });
  } catch (e) {
    return json(500, { error: '서버 오류: ' + (e && e.message ? e.message : String(e)) });
  }
};
