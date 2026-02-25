# Agent notes
Follow user-provided instructions.

## Local dev boot sequence for Codex
When a task needs authenticated UI checks (e.g., Playwright screenshots):

```bash
docker compose up -d
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/anaxi'
npx prisma migrate deploy
npx prisma db seed
npm run dev
# then playwright
```
