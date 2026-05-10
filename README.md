# EquipHub Full App (PERN + Docker)

## Structure
- `Frontend/` React + Vite UI integrated with API
- `backend/` Express API with PostgreSQL datastore
- `backend/db/init/` SQL init scripts (schema + seed)

## Environment Files
- `Frontend/.env`
- `Frontend/.env.example`
- `backend/.env`
- `backend/.env.example`

## Run Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:4000`.

## Run Frontend
```bash
cd Frontend
npm install --legacy-peer-deps
npm run dev
```
Frontend runs on `http://localhost:5173` and uses `VITE_API_BASE_URL`.

## Run With Docker Compose
```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4000`
- PostgreSQL: `localhost:5432` (`db: equiphub`, `user: postgres`, `password: postgres`)

## Implemented Backend APIs
- `GET /health`
- `GET /api/v1/assets/catalog`
- `GET /api/v1/assets/:assetId`
- `POST /api/v1/assets`
- `GET /api/v1/assets/:assetId/availability`
- `POST /api/v1/bookings/create`
- `PUT /api/v1/bookings/:bookingId/confirm-payment`
- `POST /api/v1/handover/pickup/initiate`
- `POST /api/v1/handover/verify`
- `POST /api/v1/handover/return/complete`
- `GET /api/v1/rentals?user_id=...`
