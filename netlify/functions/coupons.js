const { store, json, isAdmin, currentUser } = require('./_utils');

const KEY = 'coupons';

exports.handler = async (event, context) => {
  try {
    const s = store();
    const user = currentUser(context);

    if (event.httpMethod === 'GET') {
      const coupons = (await s.get(KEY, { type: 'json' })) || {};
      const admin = isAdmin(context);

      if (admin && event.queryStringParameters && event.queryStringParameters.all === '1') {
        return json(200, { coupons });
      }

      if (!user) return json(401, { error: '로그인이 필요해요' });
      const mine = {};
      Object.keys(coupons).forEach((code) => {
        if (coupons[code].claimedBy === user.email) mine[code] = coupons[code];
      });
      return json(200, { coupons: mine });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return json(400, { error: '잘못된 요청이에요' });
      }

      const coupons = (await s.get(KEY, { type: 'json' })) || {};

      if (body.action === 'claim') {
        if (!user) return json(401, { error: '로그인이 필요해요' });
        const code = (body.code || '').trim();
        if (!code) return json(400, { error: '쿠폰 번호를 입력해주세요' });
        const entry = coupons[code];
        if (!entry) return json(404, { error: '존재하지 않는 쿠폰 번호예요' });
        if (entry.claimedBy && entry.claimedBy !== user.email) {
          return json(409, { error: '이미 다른 계정에 등록된 쿠폰이에요' });
        }
        entry.claimedBy = user.email;
        entry.claimedAt = entry.claimedAt || new Date().toISOString();
        await s.setJSON(KEY, coupons);
        return json(200, { coupon: entry, code });
      }

      if (!isAdmin(context)) return json(403, { error: '관리자만 가능해요' });

      if (body.action === 'issue') {
        const codes = Array.isArray(body.codes) ? body.codes : [body.code];
        codes.forEach((code) => {
          code = (code || '').trim();
          if (code && !coupons[code]) {
            coupons[code] = { claimedBy: null, claimedAt: null, used: false, usedAt: null };
          }
        });
        await s.setJSON(KEY, coupons);
        return json(200, { coupons });
      }

      if (body.action === 'markUsed' || body.action === 'unmarkUsed') {
        const code = (body.code || '').trim();
        if (!coupons[code]) return json(404, { error: '존재하지 않는 쿠폰 번호예요' });
        coupons[code].used = body.action === 'markUsed';
        coupons[code].usedAt = coupons[code].used ? new Date().toISOString() : null;
        await s.setJSON(KEY, coupons);
        return json(200, { coupons });
      }

      return json(400, { error: '알 수 없는 동작이에요' });
    }

    return json(405, { error: '지원하지 않는 방식이에요' });
  } catch (e) {
    return json(500, { error: '서버 오류: ' + (e && e.message ? e.message : String(e)) });
  }
};
