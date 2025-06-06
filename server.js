const http = require('http');
const url = require('url');
const fs = require('fs');

const dataFile = 'data.json';
let db = { products: [], shoppingLists: [] };

// Load data from file if exists
if (fs.existsSync(dataFile)) {
  try {
    const raw = fs.readFileSync(dataFile);
    db = JSON.parse(raw.toString());
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

function saveDb() {
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

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
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Serve static index.html
  if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
    const html = fs.readFileSync('index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // API endpoints
  if (path === '/api/products') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.products);
    }
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const product = {
          id: Date.now().toString(),
          name: body.name || 'Unnamed',
          quantity: Number(body.quantity) || 0,
          unit: body.unit || 'unit'
        };
        db.products.push(product);
        saveDb();
        return sendJson(res, 201, product);
      } catch (err) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    }
  }

  const productMatch = path.match(/^\/api\/products\/(\d+)$/);
  if (productMatch) {
    const productId = productMatch[1];
    const product = db.products.find(p => p.id === productId);
    if (!product) {
      return sendJson(res, 404, { error: 'Not found' });
    }
    if (req.method === 'PUT') {
      try {
        const body = await parseBody(req);
        product.name = body.name ?? product.name;
        product.quantity = body.quantity !== undefined ? Number(body.quantity) : product.quantity;
        product.unit = body.unit ?? product.unit;
        saveDb();
        return sendJson(res, 200, product);
      } catch (err) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    }
    if (req.method === 'DELETE') {
      db.products = db.products.filter(p => p.id !== productId);
      saveDb();
      return sendJson(res, 204, {});
    }
    if (req.method === 'GET') {
      return sendJson(res, 200, product);
    }
  }

  // 404 for other routes
  sendJson(res, 404, { error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
