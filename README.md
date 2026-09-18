# DCCRM

The Decentralized Campus Content & Resource Mesh (DCCRM) is a peer-to-peer networking architecture and dashboard for reducing bandwidth constraints and central internet dependency in academic environments such as university hostels and department labs.

When many students download study materials, video lectures, or software packages at once, traditional campus networks can bottleneck or fail when external internet links drop. DCCRM enables nearby student devices to form a local mesh and exchange files over high-speed campus Wi-Fi.

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

Open `http://localhost:5173`. The frontend polls peers, files, and stats every three seconds. Catalog download buttons call the local mesh download endpoint and increment the mock transfer counters. The dashboard supports light and dark themes.

## API

- `GET /api/peers`
- `GET /api/files`
- `GET /api/stats`
- `GET /api/files/:id/download`
- `GET /api/health`
