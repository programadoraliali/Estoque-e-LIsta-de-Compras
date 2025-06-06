const http = require('http');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');
const { db, save, generateId } = require('./db');

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url, true);

  // Serve HTML
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const html = fs.readFileSync('index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // Register user
  if (pathname === '/api/users' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!body.email || !body.password || !body.name) {
        return sendJson(res, 400, { error: 'Missing fields' });
      }
      if (db.users.find(u => u.email === body.email)) {
        return sendJson(res, 400, { error: 'Email exists' });
      }
      const user = {
        id: generateId('u_'),
        email: body.email,
        name: body.name,
        passwordHash: hashPassword(body.password)
      };
      db.users.push(user);
      save();
      return sendJson(res, 201, { id: user.id, email: user.email, name: user.name });
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
  }

  // Login
  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const user = db.users.find(u => u.email === body.email);
      if (!user || user.passwordHash !== hashPassword(body.password)) {
        return sendJson(res, 401, { error: 'Invalid credentials' });
      }
      return sendJson(res, 200, { id: user.id, email: user.email, name: user.name });
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
  }

  // Create family
  if (pathname === '/api/families' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const user = db.users.find(u => u.id === body.userId);
      if (!user || !body.name) {
        return sendJson(res, 400, { error: 'Invalid data' });
      }
      const family = { id: generateId('f_'), name: body.name, createdBy: user.id };
      db.families.push(family);
      db.familyMembers.push({ familyId: family.id, userId: user.id, role: 'admin' });
      save();
      return sendJson(res, 201, family);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
  }

  // Join family
  const joinMatch = pathname.match(/^\/api\/families\/([^/]+)\/join$/);
  if (joinMatch && req.method === 'POST') {
    try {
      const familyId = joinMatch[1];
      const body = await parseBody(req);
      const user = db.users.find(u => u.id === body.userId);
      const family = db.families.find(f => f.id === familyId);
      if (!user || !family) {
        return sendJson(res, 400, { error: 'Invalid data' });
      }
      if (!db.familyMembers.find(m => m.familyId === familyId && m.userId === user.id)) {
        db.familyMembers.push({ familyId, userId: user.id, role: 'member' });
        save();
      }
      return sendJson(res, 200, { joined: true });
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
  }

  // Categories
  const catMatch = pathname.match(/^\/api\/families\/([^/]+)\/categories$/);
  if (catMatch) {
    const familyId = catMatch[1];
    if (req.method === 'GET') {
      const cats = db.categories.filter(c => c.familyId === familyId);
      return sendJson(res, 200, cats);
    }
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.name) {
          return sendJson(res, 400, { error: 'Missing name' });
        }
        const cat = { id: generateId('c_'), familyId, name: body.name };
        db.categories.push(cat);
        save();
        return sendJson(res, 201, cat);
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    }
  }

  // Products
  const prodMatch = pathname.match(/^\/api\/families\/([^/]+)\/products$/);
  if (prodMatch) {
    const familyId = prodMatch[1];
    if (req.method === 'GET') {
      const products = db.products.filter(p => p.familyId === familyId);
      return sendJson(res, 200, products);
    }
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.name || body.quantity === undefined || !body.unit || !body.minimum) {
          return sendJson(res, 400, { error: 'Missing fields' });
        }
        const product = {
          id: generateId('p_'),
          familyId,
          categoryId: body.categoryId || null,
          name: body.name,
          current_quantity: Number(body.quantity),
          minimum_quantity: Number(body.minimum),
          unit: body.unit,
          created_by: body.userId
        };
        db.products.push(product);
        save();
        return sendJson(res, 201, product);
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    }
  }

  // Update/Delete product
  const prodIdMatch = pathname.match(/^\/api\/families\/([^/]+)\/products\/([^/]+)$/);
  if (prodIdMatch) {
    const familyId = prodIdMatch[1];
    const productId = prodIdMatch[2];
    const product = db.products.find(p => p.id === productId && p.familyId === familyId);
    if (!product) return sendJson(res, 404, { error: 'Not found' });

    if (req.method === 'PUT') {
      try {
        const body = await parseBody(req);
        if (body.quantity !== undefined) product.current_quantity = Number(body.quantity);
        if (body.minimum !== undefined) product.minimum_quantity = Number(body.minimum);
        if (body.name) product.name = body.name;
        if (body.categoryId) product.categoryId = body.categoryId;
        save();
        return sendJson(res, 200, product);
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    }
    if (req.method === 'DELETE') {
      db.products = db.products.filter(p => p.id !== productId);
      save();
      return sendJson(res, 204, {});
    }
  }

  // Shopping lists manual
  const listMatch = pathname.match(/^\/api\/families\/([^/]+)\/shopping-lists$/);
  if (listMatch) {
    const familyId = listMatch[1];
    if (req.method === 'GET') {
      const lists = db.shoppingLists.filter(l => l.familyId === familyId);
      return sendJson(res, 200, lists);
    }
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.name || !Array.isArray(body.items)) {
          return sendJson(res, 400, { error: 'Invalid data' });
        }
        const listId = generateId('sl_');
        const items = body.items.map(it => ({
          id: generateId('i_'),
          productId: it.productId || null,
          customName: it.customName || null,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'unit',
          is_purchased: false
        }));
        const list = { id: listId, familyId, name: body.name, createdAt: Date.now(), items };
        db.shoppingLists.push(list);
        save();
        return sendJson(res, 201, list);
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    }
  }

  // Auto list
  const autoListMatch = pathname.match(/^\/api\/families\/([^/]+)\/shopping-lists\/auto$/);
  if (autoListMatch && req.method === 'POST') {
    const familyId = autoListMatch[1];
    const lowStock = db.products.filter(p => p.familyId === familyId && p.current_quantity <= p.minimum_quantity);
    const listId = generateId('sl_');
    const items = lowStock.map(p => ({
      id: generateId('i_'),
      productId: p.id,
      quantity: Math.max(p.minimum_quantity - p.current_quantity, 1),
      unit: p.unit,
      is_purchased: false
    }));
    const list = { id: listId, familyId, name: 'Auto List', createdAt: Date.now(), items };
    db.shoppingLists.push(list);
    save();
    return sendJson(res, 201, list);
  }

  sendJson(res, 404, { error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
