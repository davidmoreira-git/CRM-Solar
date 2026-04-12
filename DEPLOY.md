# Deploy

## Melhor caminho para este projeto
Para o seu caso, eu recomendo **Railway**:
- sobe app Node com Docker facilmente
- cria PostgreSQL no mesmo projeto
- entrega `DATABASE_URL`
- e permite publicar pela internet sem configurar servidor manualmente

## Variaveis principais
- `HOST=0.0.0.0`
- `PORT=3000`
- `NODE_ENV=production`
- `JWT_SECRET`
- `TOKEN_EXPIRES_IN=7d`
- `UPLOADS_DIR=./uploads`
- `DATABASE_URL`

## Railway
1. Crie conta em Railway.
2. Crie um projeto novo.
3. Adicione um banco PostgreSQL.
4. Faça deploy deste repositório como app.
5. Configure as variaveis de ambiente usando o modelo de `.env.example`.
6. Defina um valor forte para `JWT_SECRET`.
7. Garanta que a app use a porta `3000`.
8. Publique e teste o endpoint `/health`.

## Docker local
```bash
docker build -t crm-dmsolartech .
docker run -d -p 3000:3000 --env-file .env --name crm-dmsolartech crm-dmsolartech
```

## Observacoes importantes
- O primeiro usuario cadastrado vira `admin`.
- Os proximos usuarios entram como `client`.
- Em producao, use armazenamento persistente para a pasta `uploads`.
- Se a hospedagem nao persistir disco local, os arquivos enviados podem ser perdidos em novo deploy. O ideal futuro e mover uploads para S3, Cloudinary ou similar.
