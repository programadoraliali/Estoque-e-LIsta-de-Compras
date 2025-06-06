const fs = require('fs');

const DATA_FILE = 'data.json';
const defaultDb = {
  users: [],
  families: [],
  familyMembers: [],
  categories: [],
  products: [],
  shoppingLists: []
};

let db = { ...defaultDb };

if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    console.error('Failed to load DB, using defaults', e);
  }
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function generateId(prefix = '') {
  return prefix + Math.random().toString(36).substr(2, 9);
}

module.exports = { db, save, generateId };
