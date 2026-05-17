# Finance Assistant

Finance Assistant is a self-hosted portfolio tracker for stocks, funds, gold, and silver. It provides watchlists, live public-market pricing, holding cost tracking, profit/loss calculation, asset allocation views, bilingual UI, and local SQLite persistence.

## Features

- Portfolio dashboard with total assets, cost, profit/loss, and allocation charts.
- Stock watchlist with search, refresh, delete, add-position cost averaging, and long-press drag sorting.
- Fund watchlist with NAV refresh, delete, add-position cost averaging, and long-press drag sorting.
- Gold and silver price pages with holding calculators and day/week/month/year trend charts.
- English and Chinese UI switcher.
- Local SQLite data storage.
- Docker Compose deployment with persistent data mounted from `./data`.

## Tech Stack

- Frontend: React, React Router, Recharts, Axios
- Backend: Node.js, Express, better-sqlite3
- Data sources: free public market endpoints with offline fallback samples
- Deployment: Docker Compose, Nginx frontend container

## Project Structure

```text
finance-assistant/
  backend/          Express API, services, SQLite setup
  frontend/         React application
  data/             Local SQLite database directory, ignored by git
  docker-compose.yml
  DEPLOYMENT.md
```

## Local Development

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Start the backend:

```bash
cd backend
npm start
```

Start the frontend:

```bash
cd frontend
npm start
```

Open:

```text
http://localhost:3000
```

The frontend development server proxies API calls to:

```text
http://localhost:3001
```

## Docker Deployment

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:6605
```

Stop:

```bash
docker compose down
```

## Data Persistence

Runtime data is stored in:

```text
./data/finance.db
```

The database is intentionally ignored by git. Back it up separately if needed:

```bash
cp ./data/finance.db ./data/finance.backup.db
```

## Security Notes

- No API keys are required for the current public data-source setup.
- Do not commit `.env` files, local databases, logs, or build outputs.
- `.gitignore` excludes `node_modules`, frontend build output, SQLite database files, logs, and local environment files.

## Validation

Frontend production build:

```bash
cd frontend
npm run build
```

Backend syntax check example:

```bash
node -c backend/server.js
```
