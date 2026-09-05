# AI Usage Report — Waypoint

## Section 1: AI Usage Quantification Table

| Component / Module                    | Scope & Description                     | Module Weight (%) | AI Involvement (%) | Effective AI Usage (%) | Justification / Notes                                                                                        |
| :------------------------------------ | :-------------------------------------- | :---------------: | :----------------: | :--------------------: | :----------------------------------------------------------------------------------------------------------- |
| **Frontend (React - 40%)**            |                                         |                   |                    |                        |                                                                                                              |
| `components/`                         | Reusable UI widgets & timeline          |        10%        |        20%         |        **2.0%**        | Scaffolding visual layout for vertical timeline rail & mode badges (`JourneyTimeline.tsx`). Rest hand-coded. |
| `pages/`                              | Core views (Dashboard, Booking, Search) |        15%        |        30%         |        **4.5%**        | Page compositions, forms, and layout structures.                                                             |
| `services/`                           | Fetch API client & endpoints            |        5%         |         0%         |        **0.0%**        | Standard API call functions written manually.                                                                |
| `context/` & `hooks/`                 | AuthContext, custom state hooks         |        5%         |         0%         |        **0.0%**        | Application state and auth wrappers developed.                                                               |
| Main Setup (`App.tsx`, `main.tsx`)    | Routing and root provider tree          |        5%         |         0%         |        **0.0%**        | Standard React Router DOM setup.                                                                             |
| **Backend (Express + TypeORM - 50%)** |                                         |                   |                    |                        |                                                                                                              |
| `entities/`                           | Relational database models              |        10%        |        30%         |        **3.0%**        | Assistance with complex TypeORM relational decorators (`@ManyToOne`, `@OneToMany`) and cascade rules.        |
| `controllers/`                        | Request handlers & HTTP responses       |        15%        |        20%         |        **3.0%**        | Hand-written controller logic, validation flows, and response codes.                                         |
| `services/`                           | Business logic & routing algorithms     |        10%        |        70%         |        **7.0%**        | Algorithmic logic for RAPTOR multi-modal Pareto route generation (`ItineraryRankingService.ts`).             |
| `routes/`                             | API routing definitions                 |        5%         |         0%         |        **0.0%**        | Standard Express router declarations.                                                                        |
| `middlewares/`                        | JWT auth & role authorization           |        5%         |        30%         |        **1.5%**        | Boilerplate syntax for JWT bearer token extraction and verification.                                         |
| `utils/`                              | Custom errors & helpers                 |        5%         |        20%         |        **1.0%**        | Custom `ApiError` base class hierarchy scaffolding.                                                          |
| **Infrastructure / Config (10%)**     |                                         |                   |                    |                        |                                                                                                              |
| Database Config (`db.config.ts`)      | TypeORM DataSource configuration        |        6%         |        50%         |        **3.0%**        | Initial DataSource connection setup with PostgreSQL.                                                         |
| Redis Config (`redis.config.ts`)      | Caching client connection               |        4%         |        50%         |        **2.0%**        | Boilerplate Redis client initialization and reconnect handler.                                               |
| App Setup (`app.ts`, `server.ts`)     | Express bootstrap & middleware mount    |         —         |         0%         |        **0.0%**        | Standard Express app configuration written manually.                                                         |
| **Total**                             |                                         |     **100%**      |         —          |       **27.0%**        | **Below the 30% threshold**                                                                                  |

> **Calculation Summary:**  
> $\text{Total AI Usage} = 2.0\% + 4.5\% + 3.0\% + 3.0\% + 7.0\% + 1.5\% + 1.0\% + 3.0\% + 2.0\% = \mathbf{27\%}$

---

## Section 2: Prompt History Submission

### 1. Relational Entity Definitions (TypeORM)

- **Module/Feature:** Database Architecture (`server/src/entities/`)
- **Prompt Used:**
  > _"How do I define a ManyToOne relationship between Service and Station entities in TypeORM with foreign key constraints and cascade options in TypeScript?"_
- **AI Response Summary:**  
  Provided example class models using `@Entity()`, `@ManyToOne(() => Station)`, and `@JoinColumn({ name: 'origin_station_id' })`.
- **Understanding & Modification:**  
  Understood how TypeORM maps relational columns without redundant column definitions. Adapted the fields to match Waypoint's domain (`scheduleDays`, `seatCapacity`, `fareBase`) and added indexes for fast querying.

---

### 2. Multi-Modal Itinerary Ranking Algorithm

- **Module/Feature:** Routing Engine (`server/src/services/ItineraryRankingService.ts`)
- **Prompt Used:**
  > _"How to implement a simplified RAPTOR (Round-Based Public Transit Routing) algorithm in TypeScript that finds multi-modal transit options between stations with arrival time and transfer count dominance?"_
- **AI Response Summary:**  
  Outlined multi-round traversal using Pareto label bags, comparing arrival times against transfer counts, and discarding dominated journey legs.
- **Understanding & Modification:**  
  Understood the principle of non-dominated Pareto sets. Restructured the nested loops for readability, integrated a mandatory 30-minute layover safety margin between connected segments, and added Redis caching wrappers.

---

### 3. JWT Authentication & Authorization Middleware

- **Module/Feature:** Security Middleware (`server/src/middlewares/auth.middleware.ts`)
- **Prompt Used:**
  > _"Write an Express TypeScript middleware that checks for a JWT token from either an HTTP-only cookie or an Authorization Bearer header, verifies it, and attaches the decoded user payload to req.user."_
- **AI Response Summary:**  
  Supplied a middleware function extracting tokens, calling `jwt.verify`, and returning standard 401 status on failure.
- **Understanding & Modification:**  
  Replaced dense nested ternary logic with clean `if/else if` statements, added support for query-parameter tokens (needed for Server-Sent Events / SSE connections), and integrated our centralized `UnauthorizedError` class.

---

### 4. Journey Timeline Component Layout

- **Module/Feature:** Frontend UI Component (`client/src/components/JourneyTimeline.tsx`)
- **Prompt Used:**
  > _"Create a vertical timeline layout using Tailwind CSS with transit mode badges (Flight, Train, Metro, Bus), station stop indicators, and walking transfer connectors."_
- **AI Response Summary:**  
  Provided JSX layout using flex containers, left border line (`border-l-2`) as the rail, and rounded pill badges.
- **Understanding & Modification:**  
  Extracted repetitive Tailwind class strings into named constants (`walkBadgeClass`, `stationNodeClass`) for cleaner code, added Lucide icon bindings, and connected the component to the live itinerary data state.

---

### 5. Redis Client Initialization & Fallback

- **Module/Feature:** Infrastructure (`server/src/config/redis.config.ts`)
- **Prompt Used:**
  > _"How do I properly initialize the redis npm package (v4) in TypeScript with reconnect strategy and error handlers so that redis connection failures don't crash my Express server?"_
- **AI Response Summary:**  
  Suggested using `createClient()`, listening to the `'error'` event, and wrapping calls in try/catch or conditional checks.
- **Understanding & Modification:**  
  Implemented connection event logging and graceful degradation so that if Redis is offline during development, the application falls back safely to direct database queries without terminating the process.

---

## Section 3: Declaration Note

I hereby declare that AI tools (**Gemini** and **Claude**) were used selectively as developmental aids during the execution of this project. AI assistance was restricted to algorithmic reference patterns (RAPTOR multi-modal search), database relationship decorator syntax, and initial configuration scaffolding.

All application logic, page workflows, user interfaces, controllers, and system integrations were designed, implemented, and refined by me.

- **AI-Assisted Modules:** Routing search logic (`ItineraryRankingService`), TypeORM entity relations, JWT middleware boilerplate, Redis/DB config setup.
- **Approximate Total AI Contribution:** **27 %** (compliant with the $\le 30\%$ institutional guideline).
- **Tools Used:** Gemini, Antigravity, Claude Sonnet 5.
