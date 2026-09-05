# Waypoint - Multi-Modal Travel Itinerary System

Waypoint is a full-stack web application designed for a seamless, multi-modal travel experience. It allows travelers to book unified journeys across flights, trains, metros, and local buses. Its defining feature is a **Disruption Detection and Cascade Re-plan Engine** which mathematically detects broken layovers due to operator delays, automatically shelves obsolete segments, and autonomously books backup transit options in real-time.

## Features
- **Multi-Modal Search Algorithm**: Uses Breadth-First Search (BFS) to stitch together routes across different transport methods, enforcing a strict 30-minute layover safety buffer.
- **Pessimistic Locking for Bookings**: Utilizes SQL transactions to prevent double-booking of limited seat inventory.
- **Cascade Replanning**: Instantly routes travelers to alternative transport when delays break layover margins.
- **Role-Based Access Control**: Fully secured with JWTs separating Travelers, Operators, and Admins.
- **Polished Dashboard**: React-based dashboard featuring modern visuals, `react-leaflet` integrations, and dynamic ticket bookings with QR codes.
- **High-Performance Caching**: Employs Redis caching for intensive graph-search itinerary queries.

## Technology Stack
- **Backend**: Node.js, Express, TypeScript, TypeORM, PostgreSQL, Redis
- **Frontend**: React, Vite, TailwindCSS, React-Leaflet, qrcode.react

## How to Run
1. Start the infrastructure:
   ```bash
   docker-compose up -d
   ```
2. Start the backend:
   ```bash
   cd server
   npm install
   npm run seed
   npm run dev
   ```
3. Start the frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
