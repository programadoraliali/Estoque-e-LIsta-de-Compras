# FamilyStock Prototype

This repository contains a lightweight prototype of **FamilyStock**, an application for managing household stock and shopping lists. It uses only Node.js core modules and persists data in a JSON file (`data.json`).

## Executando

1. Instale Node.js (versão 14 ou superior).
2. Na raiz do projeto execute:

```bash
node server.js
```

3. Acesse `http://localhost:3000` no navegador para utilizar a interface simples.

## Principais rotas da API

- `POST /api/users` – cria usuário `{ name, email, password }`
- `POST /api/login` – autentica usuário `{ email, password }`
- `POST /api/families` – cria família `{ name, userId }`
- `POST /api/families/:id/join` – usuário entra em família `{ userId }`
- `GET /api/families/:id/categories` – lista categorias
- `POST /api/families/:id/categories` – cria categoria `{ name }`
- `GET /api/families/:id/products` – lista produtos
- `POST /api/families/:id/products` – adiciona produto `{ name, quantity, minimum, unit, categoryId?, userId }`
- `PUT /api/families/:fid/products/:pid` – atualiza produto
- `DELETE /api/families/:fid/products/:pid` – remove produto
- `GET /api/families/:id/shopping-lists` – lista listas de compras
- `POST /api/families/:id/shopping-lists` – cria lista manual `{ name, items }`
- `POST /api/families/:id/shopping-lists/auto` – gera lista automática de itens em falta

Todos os dados são mantidos em memória e salvos em `data.json` a cada alteração.
