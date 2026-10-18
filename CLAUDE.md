# CLAUDE.md — Agent Operating Instructions

AlgoClash is a real-time, head-to-head (1v1) competitive coding and single-elimination tournament platform. It orchestrates automated tournament brackets, provides an in-browser code editor (Monaco) with live opponent status, executes Java and C++ solutions in a remote sandboxed judging engine (Judge0), streams verdicts over WebSockets (STOMP), and updates Elo-style ratings.

## Tech Stack & Pinned Versions
- **Backend**: Java 17+ (JDK 17/21/25), Spring Boot `3.5.3`, Spring Data JPA, Spring Security, Spring WebSocket (STOMP), PostgreSQL Driver `42.7.7`, Project Lombok `1.18.38` (or `1.18.34`), JJWT `0.11.5` (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`), Resilience4j `2.2.0` (`resilience4j-spring-boot3`, `spring-boot-starter-aop`), SpringDoc OpenAPI `2.7.0`, Jackson `jackson-datatype-jsr310`.
- **Frontend**: React `^19.2.0`, React DOM `^19.2.0`, TypeScript `~5.9.3`, Vite `^7.3.1`, Tailwind CSS `^3.4.15`, Monaco Editor `@monaco-editor/react ^4.7.0`, STOMP `@stomp/stompjs ^7.3.0`, SockJS `sockjs-client ^1.6.1`, Axios `^1.13.6`, React Router DOM `^7.13.1`, PostCSS `^8.5.6`, Autoprefixer `^10.4.27`, ESLint `^9.39.1`.
- **Infra**: PostgreSQL 16 (app database), Docker Compose, Judge0 v1.13.1+ (`judge0/judge0:latest`, PostgreSQL 13, Redis 6).

## Exact Commands
```bash
# Infrastructure
docker compose up -d postgres       # Start AlgoClash Postgres DB (port 5432)
docker compose up -d                # Start Postgres + Judge0 sandbox (port 2358)
docker compose down                 # Stop all containers

# Backend (run from /backend)
./mvnw clean compile               # Compile backend
./mvnw test                        # Run tests
./mvnw spring-boot:run             # Start backend server (port 8080)

# Frontend (run from /frontend)
npm install                        # Install dependencies
npm run dev                        # Start Vite dev server (port 5173)
npm run build                      # Typecheck (tsc -b) & bundle for production
npm run lint                       # Run ESLint
```

## Folder Structure Overview
```text
algo-clash/
├── backend/src/main/java/com/algoclash/  # Java packages: auth, common, config, match, problem, series, submission, user
├── backend/src/main/resources/           # application.properties
├── frontend/src/                         # api, auth, components, pages, routes, App.tsx, index.css
├── judge0/                               # docker-compose.yml, judge0.conf
├── reverse-engineering/                  # CLAUDE.md, plan.md, PROJECT_SPEC.md, ARCHITECTURE.md
└── docker-compose.yml                    # Root unified infrastructure compose
```

## Coding Conventions & Repository Patterns
- **Backend Architecture**: Strict layered architecture (Controller → Service → Repository). JPA entities must never be returned directly by REST controllers; always return DTOs.
- **Lombok**: Use `@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@RequiredArgsConstructor`.
- **Naming**: REST endpoints use lowercase plural nouns (`/api/series`, `/api/problems`, `/api/matches`). DTOs end in `Request`, `Response`, `Dto`, or `Message`.
- **Error Handling**: Throw `ResponseStatusException(HttpStatus, message)` in service methods or let Spring Security handle 401/403.
- **Database Consistency**: Use pessimistic row locking (`findByIdForUpdate`) and `Propagation.REQUIRES_NEW` during match settlement to prevent dual-winner race conditions.
- **Frontend Styling**: Tailwind CSS utility classes with dark/cyberpunk aesthetic (black `#000000`, cyan `#00ffcc`, amber, emerald, slate). Monaco editor uses `vs-dark`.
- **Client State & Auth**: Auth token stored in `localStorage` under key `ac_token`. Decoded client-side for role extraction. Axios interceptor attaches `Authorization: Bearer <token>` and redirects to `/login` on 401.

## Environment Variables
- `PORT`: Backend server HTTP port (default: 8080).
- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`: Postgres credentials.
- `JWT_SECRET`: Base64-encoded secret key (minimum 256 bits).
- `JWT_EXPIRATION_HOURS`: Token time-to-live in hours (default: 24).
- `APP_CORS_ALLOWED_ORIGIN`: Allowed frontend origin for CORS and WebSocket (default: `http://localhost:5173`).
- `JUDGE0_URL`: Base URL of Judge0 execution API (default: `http://localhost:2358`).
- `VITE_API_BASE_URL`: Frontend API base URL (e.g. `http://localhost:8080/api`).
- `VITE_WS_BASE_URL`: Frontend WebSocket host URL (e.g. `http://localhost:8080`).

## Workflow Rules for the Agent
1. Read `PROJECT_SPEC.md`, `ARCHITECTURE.md`, and `plan.md` before writing code.
2. Work on **ONE task at a time**, in the exact order given in `plan.md`.
3. Run tests/build after every task (`./mvnw clean compile` or `npm run build`); do not move on while anything is failing.
4. Tick the checkbox in `plan.md` when a task is done and add a one-line completion note.
5. Never add features or dependencies not in the spec without asking.
6. When unsure, check the "see original" file path, then ask.

## Do's and Don'ts
- **DO** use `SingleEliminationBracketStrategy` with random participant shuffling and pair-up logic.
- **DO** use `SimpMessagingTemplate` to broadcast submission verdicts to `/topic/match/{matchId}`.
- **DO** enforce that series sizes must be powers of 2 (8, 16, 32...).
- **DON'T** expose JPA entity relationships containing circular references without `@JsonIgnore`.
- **DON'T** evaluate submissions synchronously in the HTTP request thread; always run judging asynchronously via `@Async`.
- **DON'T** allow a match to be viewed unless the authenticated user is Player 1 or Player 2 and the match is `ONGOING` or `COMPLETED`.

## Specification Pointers
- Build Roadmap & Tasks: [plan.md](file:///c:/Users/13shi/Downloads/code-quest-main/code-quest-main/reverse-engineering/plan.md)
- Product Requirements & API Contracts: [PROJECT_SPEC.md](file:///c:/Users/13shi/Downloads/code-quest-main/code-quest-main/reverse-engineering/PROJECT_SPEC.md)
- Architecture & Design Patterns: [ARCHITECTURE.md](file:///c:/Users/13shi/Downloads/code-quest-main/code-quest-main/reverse-engineering/ARCHITECTURE.md)
