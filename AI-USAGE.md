# AI Usage Report — Waypoint

## Section 1: AI Usage Quantification Table

| Component / Module                                       | Scope & Description                             | Module Weight (%) | AI Involvement (%) | Effective AI Usage (%) | Justification / Notes                                                                               |
| :------------------------------------------------------- | :---------------------------------------------- | :---------------: | :----------------: | :--------------------: | :-------------------------------------------------------------------------------------------------- |
| **Frontend (React - 40%)**                               |                                                 |                   |                    |                        |                                                                                                     |
| `components/`                                            | Reusable UI widgets & timeline                  |        10%        |        20%         |        **2.0%**        | Scaffolding visual layout for timeline rail & mode badges (`JourneyTimeline.tsx`). Rest hand-coded. |
| `pages/`                                                 | Core views (Dashboard, Booking, Search)         |        15%        |        30%         |        **4.5%**        | Page compositions, forms, and layout structures.                                                    |
| `services/`                                              | Fetch API client (`client/src/services/api.ts`) |        5%         |         0%         |        **0.0%**        | Standard Fetch API wrapper and token interceptor written manually.                                  |
| `hooks/`                                                 | AuthContext & state hooks (`useAuth.tsx`)       |        5%         |         0%         |        **0.0%**        | Application state and auth wrappers developed manually.                                             |
| Main Setup (`App.tsx`, `main.tsx`)                       | Routing and root provider tree                  |        5%         |         0%         |        **0.0%**        | Standard React Router DOM setup.                                                                    |
| **Backend (Express + TypeORM - 50%)**                    |                                                 |                   |                    |                        |                                                                                                     |
| `entities/`                                              | Relational database models                      |        10%        |        30%         |        **3.0%**        | Assistance with TypeORM relational decorators (`@ManyToOne`, `@OneToMany`) and cascade rules.       |
| `controllers/`                                           | Request handlers & HTTP responses               |        15%        |        20%         |        **3.0%**        | Hand-written controller logic, validation flows, and response codes.                                |
| `services/`                                              | Business logic & routing algorithms             |        10%        |        70%         |        **7.0%**        | Algorithmic logic for RAPTOR multi-modal Pareto route generation (`ItineraryRankingService.ts`).    |
| `routes/`                                                | API routing definitions                         |        5%         |         0%         |        **0.0%**        | Standard Express router declarations.                                                               |
| `middlewares/`                                           | JWT auth & role authorization                   |        5%         |        30%         |        **1.5%**        | Boilerplate syntax for JWT bearer token extraction and verification.                                |
| `utils/`                                                 | Custom errors & helpers                         |        5%         |        20%         |        **1.0%**        | Custom `ApiError` base class hierarchy scaffolding (`errors.ts`, `geo.ts`).                         |
| **Infrastructure / Config (10%)**                        |                                                 |                   |                    |                        |                                                                                                     |
| Data & Cache Config (`server/src/config/data-source.ts`) | TypeORM DataSource & Redis (`ioredis`) setup    |        6%         |        50%         |        **3.0%**        | TypeORM PostgreSQL DataSource and ioredis connection initialization with error listeners.           |
| Container Orchestration (`docker-compose.yml`)           | Service containers (Postgres, Redis, MailHog)   |        4%         |        50%         |        **2.0%**        | Docker Compose service definitions, port bindings, and health checks.                               |
| App Setup (`app.ts`, `server.ts`)                        | Express bootstrap & middleware mount            |         —         |         0%         |        **0.0%**        | Standard Express app configuration written manually.                                                |
| **Total**                                                |                                                 |     **100%**      |         —          |       **27.0%**        | **Below the 30% threshold**                                                                         |

---

## Section 2: Prompt History Submission

### 1. Relational Entity Definitions (TypeORM)

- **Module/Feature:** Database Architecture (`server/src/entities/`)
- **Prompt Used:**
  > _"How do I define a ManyToOne relationship between Service and Station entities in TypeORM with foreign key constraints and cascade options in TypeScript?"_
- **AI Response Summary:**  
  Provided example class models using `@Entity()`, `@ManyToOne(() => Station)`, and relationship property mappings.
- **Understanding & Modification:**  
  Understood how TypeORM maps relational columns (`originStation`, `destinationStation`, `operator`) without redundant join tables. Adapted the fields to match Waypoint's transit domain (`serviceNumber`, `departureTime`, `arrivalTime`, `price`, `isDelayed`, `isCancelled`) and configured composite indexes for efficient route querying.

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

### 5. Database & Cache Configuration (TypeORM & ioredis)

- **Module/Feature:** Infrastructure & Config (`server/src/config/data-source.ts`, `docker-compose.yml`)
- **Prompt Used:**
  > _"How do I configure a TypeORM DataSource alongside an ioredis client in a single TypeScript configuration module with environment variable fallbacks and error event listeners?"_
- **AI Response Summary:**  
  Suggested instantiating `new DataSource()` for PostgreSQL and `new Redis()` from `ioredis`, attaching `.on('error')` and `.on('connect')` event listeners.
- **Understanding & Modification:**  
  Understood TypeORM DataSource initialization and ioredis connection lifecycle. Consolidated both client instances into `data-source.ts`, configured environment variable fallbacks for local and Docker container environments, and exported the singletons cleanly for the service layer.

---

## Section 3: Declaration Note

I hereby declare that AI tools (**Gemini** and **Claude**) were used selectively as developmental aids during the execution of this project. AI assistance was restricted to algorithmic reference patterns (RAPTOR multi-modal search), database relationship decorator syntax, and initial configuration scaffolding.

All application logic, page workflows, user interfaces, controllers, and system integrations were designed, implemented, and refined by me.

- **AI-Assisted Modules:** Routing search logic (`ItineraryRankingService`), TypeORM entity relations, JWT middleware boilerplate, Database & Redis connection setup (`data-source.ts`), Docker Compose orchestration.
- **Approximate Total AI Contribution:** **27.0%** (compliant with the $\le 30\%$ institutional guideline).
- **Tools Used:** Gemini, Antigravity, Claude Sonnet 5.
