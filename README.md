# ⚔️ AlgoClash — Real-Time Competitive Coding & Tournament Platform

AlgoClash is a high-performance, real-time head-to-head (1v1) competitive coding and single-elimination tournament platform. It automates tournament bracket progression, features an in-browser Monaco code editor with live opponent telemetry, executes Java and C++ solutions via Judge0, streams verdicts and live rankings via STOMP WebSockets, and manages dynamic Elo ratings.

---

## 🚀 Quick Start (One-Click Launchers)

For Windows environments, single-click batch scripts are provided in the project root:

| Script | Purpose |
|---|---|
| `start-all.bat` | **Launches entire stack** (PostgreSQL, Spring Boot backend on `:8080`, Vite React frontend on `:5173`, and opens browser). |
| `stop-all.bat` | Gracefully shuts down backend (:8080), frontend (:5173), and stops PostgreSQL container. |
| `start-infra.bat` | Starts PostgreSQL 16 container via Docker Compose. |
| `start-backend.bat` | Starts Spring Boot server on port `8080`. |
| `start-frontend.bat` | Starts Vite React development server on port `5173`. |

---

## 🌐 Platform URLs

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:8080](http://localhost:8080)
- **Swagger / OpenAPI Documentation**: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- **WebSocket STOMP Endpoint**: `ws://localhost:8080/ws-algoclash`
- **Default Database**: `jdbc:postgresql://localhost:5432/algoclash` (User: `postgres`, Password: `postgres`)

---

## 🛠️ Manual CLI Commands

### 1. Infrastructure
```bash
docker compose up -d postgres       # Starts PostgreSQL on port 5432
docker compose up -d                # Starts PostgreSQL + Judge0 sandbox cluster
docker compose down                 # Stops all containers
```

### 2. Backend
```bash
cd backend
./mvnw clean compile               # Compile backend source code
./mvnw test                        # Run all 41 unit and end-to-end integration tests
./mvnw spring-boot:run             # Start Spring Boot on port 8080
```

### 3. Frontend
```bash
cd frontend
npm install                        # Install frontend packages
npm run dev                        # Start Vite dev server on port 5173
npm run build                      # TypeScript check and bundle for production
```

---

## 🧪 Automated Simulations & Verifications (Phase 10)

AlgoClash includes automated integration tests and REST simulation endpoints to verify complete game-loop lifecycles:

### 1. 1v1 Duel Lifecycle Test (`P10.1.1`)
- **Endpoint**: `POST /api/dev/simulate-duel`
- **Automated Test**: `backend/src/test/java/com/algoclash/simulation/DuelLifecycleIntegrationTest.java`
- **Lifecycle Flow**:
  1. Registers two distinct duelists (`duel_p1`, `duel_p2`) at 1000 initial Elo.
  2. Seeds an active match with problem constraints and testcases.
  3. Submits Java solution code on behalf of Player 1.
  4. Evaluates solution and settles verdict as `ACCEPTED`.
  5. Finalizes match settlement with pessimistic locking (`findByIdForUpdate`).
  6. Broadcasts real-time STOMP notification to `/topic/match/{matchId}`.
  7. Updates Elo ratings: Player 1 earns **+10 Elo** (1010) and +1 win; Player 2 receives **-5 Elo** (995) and +1 loss.

### 2. 8-Player Single-Elimination Tournament Simulation (`P10.1.2`)
- **Endpoint**: `POST /api/dev/simulate-8player-series`
- **Automated Test**: `backend/src/test/java/com/algoclash/simulation/EightPlayerSeriesSimulationIntegrationTest.java`
- **Lifecycle Flow**:
  1. Enlists 8 registered competitors (`tourney_p1` through `tourney_p8`).
  2. Configures unique problems across all 3 rounds (Quarterfinals, Semifinals, Grand Finals).
  3. Automatically locks registration when capacity is reached (`REGISTRATION_CLOSED`).
  4. Scheduler kicks off Round 1 (`QUARTERFINALS`), generating 4 initial matches.
  5. Simulates accepted submissions and settlements for 4 quarterfinal matches.
  6. Bracket strategy pairs 4 winners and generates Round 2 (`SEMIFINALS`), activating 2 matches.
  7. Simulates semifinal settlements; advances winners to Round 3 (`GRAND FINALS`), generating 1 championship match.
  8. Final match completes; series transitions to `COMPLETED` and declares the Tournament Champion (+30 Elo, 3-0 record).

---

## 👥 Default Accounts

| Role | Username | Password | Notes |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Can create problems, schedule tournament series |
| **User** | `player1` | `password123` | Pre-seeded player |
| **User** | `player2` | `password123` | Pre-seeded player |
