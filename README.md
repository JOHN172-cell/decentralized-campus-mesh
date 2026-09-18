# DCCRM

Decentralized Campus Content & Resource Mesh: a local peer-to-peer cache and resource-sharing dashboard for university networks.

## Run the backend

```powershell
cd backend
go run .
```

The API listens on `http://localhost:8080`.

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend polls peers, files, and stats every three seconds. Catalog download buttons call the local mesh download endpoint and increment the mock transfer counters.

## API

- `GET /api/peers`
- `GET /api/files`
- `GET /api/stats`
- `GET /api/files/:id/download`
- `GET /api/health`
