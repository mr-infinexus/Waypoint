# Waypoint — Multi-Modal Travel Itinerary System

Waypoint is a full-stack web application for planning, booking, and managing multi-modal travel journeys across flights, trains, metros, and buses. It features an automated **Disruption Detection and Cascade Re-planning Engine** that monitors operator delays, detects broken layovers, alerts affected passengers via real-time SSE and email, and generates instant alternative route solutions.

---

## Key Features

- **Multi-Modal Route Search**: RAPTOR-inspired multi-criteria route engine providing Pareto-optimal journey options (Fastest, Cheapest, and Fewest Transfers) with walking transfer connections between nearby transit hubs.
- **Pessimistic Locking**: Prevents double-booking during concurrent ticket reservation using SQL transaction locks.
- **Cascade Disruption Recovery**: Detects broken connections when a service is delayed or cancelled. Automatically flags affected itineraries and generates viable replacement options.
- **Real-Time Notifications**: Server-Sent Events (SSE) push instant disruption banners to the traveler's browser, accompanied by automated transactional alert emails.
- **Role-Based Access Control (RBAC)**: Secure JWT authentication with dedicated portals for:
  - **Travelers**: Search routes, view interactive Leaflet maps, book multi-segment journeys, and access QR-coded tickets.
  - **Operators**: Manage scheduled services, report delays and cancellations, and view affected passenger counts.
  - **Admins**: Platform oversight, station registry management, and operator account activation/deactivation.
- **Redis Caching**: Caches frequent route searches and station queries for low-latency responses.

---

## Technology Stack

- **Frontend**: React, Vite, TypeScript, TailwindCSS, React-Leaflet, Lucide React, `qrcode.react`
- **Backend**: Node.js, Express, TypeScript, TypeORM
- **Databases & Cache**: PostgreSQL, Redis
- **Email & Alerts**: Nodemailer + MailHog

---

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- Docker and Docker Compose

### 1. Start Infrastructure Services
Launch PostgreSQL, Redis, and MailHog:
```bash
docker-compose up -d
```

### 2. Set Up and Run the Backend
```bash
cd server
npm install
npm run seed     # Runs migrations and seeds sample data
npm run dev      # Starts API server on http://localhost:5000
```

### 3. Set Up and Run the Frontend
```bash
cd client
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

---

## Service Endpoints & Ports

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:5173` | React single-page application |
| **Backend REST API** | `http://localhost:5000/api` | Express API endpoints |
| **Interactive API Docs** | `http://localhost:5000/api/docs` | Swagger / OpenAPI 3.1 interface |
| **MailHog Web UI** | `http://localhost:8025` | Local inbox to view outgoing email alerts |

