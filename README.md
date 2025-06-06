# FamilyStock Prototype

This repository contains a simple prototype for the **FamilyStock** application. It implements a small HTTP server using Node.js core modules and stores data in `data.json`.

## Executando

1. Certifique-se de ter o Node.js instalado (versão 14 ou superior).
2. Na raiz do projeto execute:

```bash
node server.js
```

3. Abra `http://localhost:3000` no navegador.

## Endpoints Principais

- `POST /api/users` – cria um usuário `{ email, name, password }`
- `POST /api/login` – autentica um usuário `{ email, password }`
- `POST /api/families` – cria uma família `{ name, userId }`
- `GET /api/families/:id/products` – lista produtos da família
- `POST /api/families/:id/products` – adiciona produto `{ name, quantity, minimum, unit, userId, categoryId? }`
- `PUT /api/families/:fid/products/:pid` – atualiza produto
- `POST /api/families/:id/shopping-lists/auto` – gera lista automática de itens com estoque baixo

Todos os dados são mantidos em memória e persistidos em `data.json`.
