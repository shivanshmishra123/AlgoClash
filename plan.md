# plan.md — AlgoClash Re-Engineering Roadmap

This roadmap provides an atomic, step-by-step implementation plan to rebuild the **AlgoClash** platform from scratch.

---

## Progress Summary

| Phase | Description | Status | % Done |
|---|---|---|---|
| **Phase 0** | Scaffolding, Tooling & Environment Configuration | Completed | 100% |
| **Phase 1** | Data Layer, Entities & Persistence Repositories | Completed | 100% |
| **Phase 2** | Security, Identity & JWT Authentication Subsystem | Completed | 100% |
| **Phase 3** | Algorithmic Problem Management Subsystem | Completed | 100% |
| **Phase 4** | Tournament (Series) Engine & Bracket Strategy | Completed | 100% |
| **Phase 5** | 1v1 Match Lifecycle & Access Control Engine | Completed | 100% |
| **Phase 6** | Code Execution, Judge0 Client & WebSocket Broker | Completed | 100% |
| **Phase 7** | Elo Rating Subsystem & Competitive User Profiles | Completed | 100% |
| **Phase 8** | Frontend Scaffolding, Authentication & Shared UI | Not Started | 0% |
| **Phase 9** | Frontend Pages (Lobby, Bracket, Arena, Admin) | Not Started | 0% |
| **Phase 10** | End-to-End Verification, Performance & Polish | Not Started | 0% |

---

## Phase 0: Scaffolding, Tooling & Environment Configuration

### Part 0.1: Project Repository & Docker Infrastructure
- [x] **P0.1.1 Docker Compose Infrastructure Setup**: Configure root `docker-compose.yml` defining `postgres:16-alpine` on port 5432, plus Judge0 sandbox services (`server`, `worker`, `judge0-db`, `judge0-redis`) on port 2358.
  - Depends on: None
  - Original reference: `docker-compose.yml`, `judge0/docker-compose.yml`, `judge0/judge0.conf`
  - Done when: Running `docker compose up -d postgres` starts healthy PostgreSQL on port 5432.
  - Completed: Root docker-compose.yml, judge0/judge0.conf, and judge0/docker-compose.yml created; algoclash-postgres running healthy on port 5432.
- [x] **P0.1.2 Backend Maven Scaffolding**: Initialize `/backend` directory with Maven wrapper and `pom.xml` specifying Spring Boot `3.5.3`, Java 17, Lombok `1.18.38`, PostgreSQL, Spring Security, Validation, Web, WebSocket, JJWT `0.11.5`, and Resilience4j `2.2.0`.
  - Depends on: None
  - Original reference: `backend/pom.xml`, `backend/mvnw`, `backend/mvnw.cmd`
  - Done when: Running `./mvnw clean compile` succeeds without error.
  - Completed: Maven wrapper and pom.xml scaffolded for com.algoclash; ./mvnw clean compile passes with BUILD SUCCESS.
- [x] **P0.1.3 Backend Configuration Files**: Create `application.properties` with fallback defaults for Postgres, JWT, CORS, Judge0, and Resilience4j.
  - Depends on: P0.1.2
  - Original reference: `backend/src/main/resources/application.properties`, `backend/.env.example`
  - Done when: Properties contain fallbacks for `localhost:5432/algoclash`, `JWT_SECRET`, and port `8080`.
  - Completed: Configured application.properties and .env.example with fallbacks for localhost:5432/algoclash, port 8080, and JWT_SECRET.
- [x] **P0.1.4 Frontend Vite Scaffolding**: Initialize `/frontend` with Vite `^7.3.1`, React `^19.2.0`, TypeScript `~5.9.3`, and Tailwind CSS `^3.4.15`.
  - Depends on: None
  - Original reference: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`
  - Done when: Running `npm install && npm run build` compiles with zero errors.
  - Completed: Scaffolded /frontend with Vite, React 19, TypeScript, Tailwind; verified npm install and npm run build compile with zero errors.

> **Phase 0 Checkpoint**: Docker starts PostgreSQL 16 on port 5432; backend compiles via `./mvnw compile`; frontend builds via `npm run build`.

---

## Phase 1: Data Layer, Entities & Persistence Repositories

### Part 1.1: Core Entities
- [x] **P1.1.1 User Entity & UserRole Enum**: Implement `UserRole` (`USER`, `ADMIN`) and `User` JPA entity with fields (`id`, `username`, `email`, `passwordHash`, `rating`, `wins`, `losses`, `role`, `createdAt`).
  - Depends on: P0.1.2
  - Original reference: `backend/src/main/java/com/codequest/user/User.java`, `UserRole.java`
  - Done when: Hibernate creates `users` table with unique constraints on `username` and `email`.
  - Completed: User entity and UserRole enum implemented in com.algoclash.user; users table created in PostgreSQL with unique constraints.
- [x] **P1.1.2 Problem Entity & ProblemDifficulty Enum**: Implement `ProblemDifficulty` (`EASY`, `MEDIUM`, `HARD`) and `Problem` JPA entity with statement, constraints, sample I/O, and `testcasesJson`.
  - Depends on: P1.1.1
  - Original reference: `backend/src/main/java/com/codequest/problem/Problem.java`, `ProblemDifficulty.java`
  - Done when: `problems` table is created in database.
  - Completed: Problem entity and ProblemDifficulty enum implemented in com.algoclash.problem; problems table created in PostgreSQL.
- [x] **P1.1.3 Series Entity & SeriesStatus Enum**: Implement `SeriesStatus` and `Series` JPA entity with `participants` ManyToMany relationship.
  - Depends on: P1.1.1
  - Original reference: `backend/src/main/java/com/codequest/series/Series.java`, `SeriesStatus.java`
  - Done when: `series` and join table `series_participants` are created.
  - Completed: Series entity and SeriesStatus enum implemented; series and series_participants tables created in PostgreSQL.
- [x] **P1.1.4 SeriesRoundConfig Entity**: Implement `SeriesRoundConfig` mapping `(series_id, round_number) -> problem_id` with unique constraint.
  - Depends on: P1.1.2, P1.1.3
  - Original reference: `backend/src/main/java/com/codequest/series/SeriesRoundConfig.java`
  - Done when: `series_round_config` table is created with composite unique constraint.
  - Completed: SeriesRoundConfig implemented with composite unique constraint; series_round_config table created in PostgreSQL.
- [x] **P1.1.5 Match Entity & MatchState Enum**: Implement `MatchState` (`PENDING`, `ONGOING`, `COMPLETED`, `CANCELLED`) and `Match` entity with references to `Series`, `Problem`, `player1`, `player2`, and `winner`.
  - Depends on: P1.1.2, P1.1.3
  - Original reference: `backend/src/main/java/com/codequest/match/Match.java`, `MatchState.java`
  - Done when: `matches` table is created with foreign keys.
  - Completed: Match entity and MatchState enum implemented; matches table created in PostgreSQL with foreign keys.
- [x] **P1.1.6 Submission Entity, Language & Verdict Enums**: Implement `SubmissionLanguage` (`JAVA`, `CPP`), `SubmissionVerdict`, and `Submission` entity with `@JsonIgnore` on parent references.
  - Depends on: P1.1.5
  - Original reference: `backend/src/main/java/com/codequest/submission/Submission.java`, `SubmissionLanguage.java`, `SubmissionVerdict.java`
  - Done when: `submissions` table is created.
  - Completed: Submission entity and enums implemented; submissions table created in PostgreSQL.

### Part 1.2: Repositories & Custom Queries
- [x] **P1.2.1 UserRepository**: Implement `findByUsername`, `findByEmail`, `existsByUsername`, and `existsByEmail`.
  - Depends on: P1.1.1
  - Original reference: `backend/src/main/java/com/codequest/user/UserRepository.java`
  - Done when: User lookup queries pass integration tests.
  - Completed: UserRepository created with all query methods.
- [x] **P1.2.2 ProblemRepository & SeriesRepository**: Implement standard JPA repositories and `findByStatusAndStartsAtBefore` on `SeriesRepository`.
  - Depends on: P1.1.2, P1.1.3
  - Original reference: `backend/src/main/java/com/codequest/problem/ProblemRepository.java`, `backend/src/main/java/com/codequest/series/SeriesRepository.java`
  - Done when: Query methods return correct instances.
  - Completed: ProblemRepository, SeriesRepository, and SeriesRoundConfigRepository created with query methods.
- [x] **P1.2.3 MatchRepository with Pessimistic Locking**: Implement `findByIdForUpdate` with `@Lock(LockModeType.PESSIMISTIC_WRITE)`, `findBySeriesAndRoundOrderByIdAsc`, and `findOngoingStartedBefore`.
  - Depends on: P1.1.5
  - Original reference: `backend/src/main/java/com/codequest/match/MatchRepository.java`
  - Done when: Lock query generates `SELECT ... FOR UPDATE` in SQL logs.
  - Completed: MatchRepository implemented with pessimistic write locking and query methods.
- [x] **P1.2.4 SubmissionRepository**: Implement `findTopByMatchIdAndUserIdOrderByCreatedAtDesc`.
  - Depends on: P1.1.6
  - Original reference: `backend/src/main/java/com/codequest/submission/SubmissionRepository.java`
  - Done when: Latest submission query retrieves top record.
  - Completed: SubmissionRepository created with top submission query.

> **Phase 1 Checkpoint**: All 6 JPA entities and 5 repositories created; application boots and creates valid relational schema in PostgreSQL.

---

## Phase 2: Security, Identity & JWT Authentication Subsystem

### Part 2.1: Token & Security Core
- [x] **P2.1.1 JwtService Implementation**: Implement HS256 JWT generation with `sub` username, `role` claim, and 24-hour expiration. Include 256-bit secret validation in `@PostConstruct`.
  - Depends on: P0.1.3
  - Original reference: `backend/src/main/java/com/codequest/auth/JwtService.java`
  - Done when: Generating a token and extracting username returns matching subject.
  - Completed: JwtService implemented with HS256 signing, claims extraction, and 256-bit secret validation.
- [x] **P2.1.2 CustomUserDetails & CustomUserDetailsService**: Implement Spring Security `UserDetails` wrapper and service loading user by username or email.
  - Depends on: P1.2.1
  - Original reference: `backend/src/main/java/com/codequest/auth/CustomUserDetails.java`, `CustomUserDetailsService.java`
  - Done when: Valid credentials return user details with `ROLE_USER` or `ROLE_ADMIN`.
  - Completed: CustomUserDetails and CustomUserDetailsService implemented supporting username or email lookup.
- [x] **P2.1.3 JwtAuthenticationFilter**: Intercept HTTP requests, extract Bearer token, validate claims, and set `SecurityContextHolder.getContext().setAuthentication()`.
  - Depends on: P2.1.1, P2.1.2
  - Original reference: `backend/src/main/java/com/codequest/auth/JwtAuthenticationFilter.java`
  - Done when: Requests with valid Bearer token populate security context.
  - Completed: JwtAuthenticationFilter implemented as OncePerRequestFilter.
- [x] **P2.1.4 SecurityConfig & CorsConfig**: Configure stateless filter chain, disabling CSRF/formLogin, permitting public endpoints, and locking admin/user routes.
  - Depends on: P2.1.3
  - Original reference: `backend/src/main/java/com/codequest/config/SecurityConfig.java`, `CorsConfig.java`
  - Done when: Unauthenticated requests to `/api/series/create` return 401/403.
  - Completed: SecurityConfig and CorsConfig configured with stateless sessions and RBAC rules.
- [x] **P2.1.5 CorrelationIdFilter**: Implement servlet filter injecting `X-Request-Id` into MDC and response header.
  - Depends on: P0.1.2
  - Original reference: `backend/src/main/java/com/codequest/common/filter/CorrelationIdFilter.java`
  - Done when: Response contains `X-Request-Id` header.
  - Completed: CorrelationIdFilter implemented at Order(1) with MDC logging.
- [x] **P2.1.6 AdminSeederConfig**: Implement `CommandLineRunner` creating default `admin` / `admin123` with rating 1500 if not existing.
  - Depends on: P1.2.1, P2.1.4
  - Original reference: `backend/src/main/java/com/codequest/config/AdminSeederConfig.java`
  - Done when: Database contains `admin` user upon startup.
  - Completed: AdminSeederConfig implemented; default admin admin@algoclash.dev seeded and verified in PostgreSQL.

### Part 2.2: Auth Endpoints
- [x] **P2.2.1 AuthService & AuthController**: Implement `POST /api/auth/register` and `POST /api/auth/login` returning `AuthResponse(token)`.
  - Depends on: P2.1.1, P2.1.4
  - Original reference: `backend/src/main/java/com/codequest/auth/AuthService.java`, `AuthController.java`
  - Done when: Registration creates user and returns JWT; login validates password and returns JWT.
  - Completed: AuthService, AuthController, and DTOs implemented for registration and authentication.

> **Phase 2 Checkpoint**: Register and login endpoints issue valid JWT tokens; default admin `admin/admin123` can authenticate; protected endpoints enforce authentication.

---

## Phase 3: Algorithmic Problem Management Subsystem

### Part 3.1: Problem Logic & APIs
- [x] **P3.1.1 Problem DTOs**: Create `CreateProblemRequest` with validation and `ProblemResponse`.
  - Depends on: P1.1.2
  - Original reference: `backend/src/main/java/com/codequest/problem/dto/CreateProblemRequest.java`, `ProblemResponse.java`
  - Done when: Request and response serialization conforms to API spec.
  - Completed: CreateProblemRequest with validation and ProblemResponse DTOs created.
- [x] **P3.1.2 ProblemService**: Implement problem creation, list all, and get by ID.
  - Depends on: P1.2.2, P3.1.1
  - Original reference: `backend/src/main/java/com/codequest/problem/ProblemService.java`
  - Done when: Created problems are stored and retrievable by ID.
  - Completed: ProblemService implemented with entity mapping, CRUD operations, and transaction boundaries.
- [x] **P3.1.3 ProblemController**: Expose `POST /api/problems` (Admin), `GET /api/problems`, `GET /api/problems/{id}`.
  - Depends on: P3.1.2, P2.1.4
  - Original reference: `backend/src/main/java/com/codequest/problem/ProblemController.java`
  - Done when: Non-admin calling `POST /api/problems` receives 403; admin receives 200 with saved problem.
  - Completed: ProblemController exposed with role-based security configured in SecurityConfig.

> **Phase 3 Checkpoint**: Admin can create coding problems with testcases; public users can list and view problem statements.

---

## Phase 4: Tournament (Series) Engine & Bracket Strategy

### Part 4.1: Bracket Strategy Pattern
- [x] **P4.1.1 BracketStrategy Interface & SingleEliminationStrategy**: Implement strategy interface and single elimination strategy (verifying power of 2, random shuffling for round 1, pairwise pairing).
  - Depends on: P1.1.5
  - Original reference: `backend/src/main/java/com/codequest/series/bracket/BracketStrategy.java`, `SingleEliminationBracketStrategy.java`
  - Done when: Shuffled players for size 8 produce 4 round-1 matches.
  - Completed: BracketStrategy and SingleEliminationBracketStrategy implemented supporting power-of-2 participant validation, random shuffling in round 1, and deterministic pair-up progression.
- [x] **P4.1.2 BracketStrategyRegistry**: Implement registry finding appropriate strategy by size.
  - Depends on: P4.1.1
  - Original reference: `backend/src/main/java/com/codequest/series/bracket/BracketStrategyRegistry.java`
  - Done when: Requesting strategy for size 8 or 16 returns `SingleEliminationBracketStrategy`.
  - Completed: BracketStrategyRegistry implemented and wired to resolve bracket strategies dynamically.

### Part 4.2: Series Lifecycle & Progression
- [x] **P4.2.1 Series DTOs & Domain Events**: Create `CreateSeriesRequest`, `SeriesDetailResponse`, `SeriesSummaryResponse`, and `MatchCompletedEvent`.
  - Depends on: P1.1.3
  - Original reference: `backend/src/main/java/com/codequest/series/dto/`, `backend/src/main/java/com/codequest/series/event/MatchCompletedEvent.java`
  - Done when: DTOs serialize correctly.
  - Completed: All Series DTOs (CreateSeriesRequest, ParticipantDto, MatchSummaryDto, RoundDto, SeriesDetailResponse, SeriesSummaryResponse) and MatchCompletedEvent record created.
- [x] **P4.2.2 SeriesService Core**: Implement series creation with round problem mappings, paginated summary listing, and series detail retrieval.
  - Depends on: P1.2.2, P4.1.2, P4.2.1
  - Original reference: `backend/src/main/java/com/codequest/series/SeriesService.java`
  - Done when: Admin creates series and verifies configured per-round problems.
  - Completed: SeriesService core implemented with round problem validation and mapping, pagination, and bracket serialization.
- [x] **P4.2.3 Series Joining Logic**: Implement `joinSeries(seriesId, user)` transitioning status to `REGISTRATION_CLOSED` when full.
  - Depends on: P4.2.2
  - Original reference: `backend/src/main/java/com/codequest/series/SeriesService.java#L125-L155`
  - Done when: Full series transitions to `REGISTRATION_CLOSED`; duplicate join rejected with 400.
  - Completed: Series join logic implemented rejecting duplicates (400), non-open series (400), full series (400), and auto-transitioning to REGISTRATION_CLOSED upon capacity.
- [x] **P4.2.4 SeriesProgressionService**: Listen for `MatchCompletedEvent`. When all matches in current round finish, advance winners to next round or mark series `COMPLETED`.
  - Depends on: P4.1.2, P4.2.1
  - Original reference: `backend/src/main/java/com/codequest/series/SeriesProgressionService.java`
  - Done when: Last match of round 1 completion triggers round 2 match generation.
  - Completed: SeriesProgressionService implemented listening for MatchCompletedEvent, advancing winners to next round bracket, and marking series COMPLETED upon final round.
- [x] **P4.2.5 SeriesScheduler**: Implement `@Scheduled` cron jobs to kick off due series (`startDueSeries`) and cancel matches older than 2 hours (`cancelTimedOutMatches`).
  - Depends on: P4.2.2
  - Original reference: `backend/src/main/java/com/codequest/series/SeriesScheduler.java`
  - Done when: Scheduler activates due series and transitions round 1 matches to `ONGOING`.
  - Completed: SeriesScheduler implemented with fixed delay jobs for automatic kickoff of closed due series and cancellation of stale matches.
- [x] **P4.2.6 SeriesController**: Expose `/api/series` endpoints (`POST` create, `GET` paginated list, `GET /{id}` detail, `POST /{id}/join`).
  - Depends on: P4.2.3, P2.1.4
  - Original reference: `backend/src/main/java/com/codequest/series/SeriesController.java`
  - Done when: REST API allows creating, viewing, and joining series.
  - Completed: SeriesController exposed with RBAC (@PreAuthorize) and full integration with Spring Data pagination and SecurityContext.

> **Phase 4 Checkpoint**: Tournaments can be created, joined by players, automatically started by scheduler, and advanced when rounds complete.

---

## Phase 5: 1v1 Match Lifecycle & Access Control Engine

### Part 5.1: Match Service & Controller
- [x] **P5.1.1 MatchResponse DTO**: Create `MatchResponse` containing problem details, opponent metadata, match state, and user's latest submission.
  - Depends on: P1.1.5
  - Original reference: `backend/src/main/java/com/codequest/match/dto/MatchResponse.java`
  - Done when: Response structure maps all required fields.
  - Completed: MatchResponse DTO implemented containing match status, opponent details, problem payload, and latest submission fields.
- [x] **P5.1.2 MatchService Access Guard**: Implement `getAccessibleMatchById(matchId, userId)` ensuring user is player1 or player2 and state is `ONGOING` or `COMPLETED`.
  - Depends on: P1.2.3, P5.1.1
  - Original reference: `backend/src/main/java/com/codequest/match/MatchService.java`
  - Done when: Non-participant gets 403; pending match gets 400; participant of ongoing match gets match entity.
  - Completed: MatchService implemented with strict participant identity verification, match state enforcement (400 on PENDING), and latest submission mapping.
- [x] **P5.1.3 MatchController**: Expose `GET /api/matches/{id}`.
  - Depends on: P5.1.2
  - Original reference: `backend/src/main/java/com/codequest/match/MatchController.java`
  - Done when: Competitor can fetch active match arena state.
  - Completed: MatchController exposed with @GetMapping("/{id}"), requiring authentication and delegating to MatchService with SecurityUtils principal.
- [x] **P5.1.4 DevSeedController**: Expose utility `POST /api/dev/seed-match` for testing matches.
  - Depends on: P5.1.3
  - Original reference: `backend/src/main/java/com/codequest/common/DevSeedController.java`
  - Done when: Endpoint seeds 2 users, demo problem, demo series, and match #1.
  - Completed: DevSeedController implemented providing POST /api/dev/seed-match which provisions test duelists, demo problem, tournament series, and active match.

> **Phase 5 Checkpoint**: Matches are securely guarded by participant identity and state; match arena data is accessible to duelists.

---

## Phase 6: Code Execution, Judge0 Integration & WebSocket Push

### Part 6.1: Judge0 Client & Resilience
- [x] **P6.1.1 WebSocketConfig**: Configure STOMP endpoint at `/ws-algoclash` with SockJS and simple broker on `/topic`.
  - Depends on: P0.1.3
  - Original reference: `backend/src/main/java/com/codequest/config/WebSocketConfig.java`
  - Done when: WebSocket client connects to `http://localhost:8080/ws-algoclash`.
  - Completed: WebSocketConfig configured registering /ws-algoclash with SockJS, /topic broker, and allowed origin patterns; SecurityConfig updated to permit WebSocket handshakes.
- [x] **P6.1.2 Judge0Client with Resilience4j**: Implement HTTP client calling Judge0 `POST /submissions?wait=true` with `@Retry` and `@CircuitBreaker`.
  - Depends on: P0.1.3
  - Original reference: `backend/src/main/java/com/codequest/submission/judge/Judge0Client.java`
  - Done when: Submitting code to Judge0 returns execution status and output; circuit breaker falls back on timeout.
  - Completed: Judge0Client implemented with RestTemplate, Resilience4j @Retry (3 attempts) and @CircuitBreaker (sliding window 5, 80% threshold) with fallback, mapping Java (91) and C++ (54).
- [x] **P6.1.3 MatchFinalizationService**: Implement pessimistic lock `finalize(matchId, winnerId)` under `Propagation.REQUIRES_NEW`, setting winner and publishing `MatchCompletedEvent`.
  - Depends on: P1.2.3, P4.2.1
  - Original reference: `backend/src/main/java/com/codequest/submission/MatchFinalizationService.java`
  - Done when: Match state transitions to `COMPLETED` and event fires; concurrent calls do not overwrite winner.
  - Completed: MatchFinalizationService implemented with Propagation.REQUIRES_NEW, pessimistic write row locking (findByIdForUpdate), state check prevention against dual winners, and MatchCompletedEvent publishing.
- [x] **P6.1.4 SubmissionPollingService**: Implement `@Async` submission judging against test cases, verdict settling, and WebSocket broadcast to `/topic/match/{matchId}`.
  - Depends on: P6.1.1, P6.1.2, P6.1.3
  - Original reference: `backend/src/main/java/com/codequest/submission/judge/SubmissionPollingService.java`
  - Done when: Submission verdicts broadcast over WebSocket destination `/topic/match/{id}`.
  - Completed: SubmissionPollingService implemented with @Async test case evaluation against Judge0, match finalization on ACCEPTED, and real-time STOMP push to /topic/match/{matchId}.
- [x] **P6.1.5 SubmissionService & SubmissionController**: Expose `POST /api/matches/{matchId}/submissions`. Validate participation, persist `PENDING` submission, and trigger async polling.
  - Depends on: P6.1.4
  - Original reference: `backend/src/main/java/com/codequest/submission/SubmissionService.java`, `SubmissionController.java`
  - Done when: Submitting code returns 200 with `PENDING` verdict, followed by async judging.
  - Completed: SubmissionService and SubmissionController exposed with @PostMapping("/{matchId}/submissions"), participant validation, match state enforcement (400 on COMPLETED/PENDING), PENDING persistence, and asynchronous judging kickoff.

> **Phase 6 Checkpoint**: User code executes against Judge0 sandbox; final verdict triggers pessimistic match settlement and streams updates over STOMP WebSocket.

---

## Phase 7: Rating Subsystem & Competitive User Profiles

### Part 7.1: Ratings & Profiles
- [x] **P7.1.1 SeriesResultService**: Implement `@EventListener` for `MatchCompletedEvent` updating winner rating (+10, +1 win) and loser rating (-5 floored at 0, +1 loss).
  - Depends on: P4.2.1, P1.2.1
  - Original reference: `backend/src/main/java/com/codequest/series/SeriesResultService.java`
  - Done when: Ratings update accurately after match finalization.
  - Completed: SeriesResultService implemented listening to MatchCompletedEvent, awarding winner (+10, +1 win) and penalizing loser (-5 floored at 0, +1 loss).
- [x] **P7.1.2 UserService & UserController**: Implement `GET /api/users/username/{username}/profile` returning stats and 10 recent matches.
  - Depends on: P1.2.1, P1.2.3
  - Original reference: `backend/src/main/java/com/codequest/user/UserService.java`, `UserController.java`
  - Done when: Profile endpoint returns user stats, win rate, and recent match list.
  - Completed: UserService and UserController implemented exposing GET /api/users/username/{username}/profile with rating, win rate calculation, and last 10 matches history.

> **Phase 7 Checkpoint**: Completed matches automatically adjust player ratings and record match history in user profiles.

---

## Phase 8: Frontend Core, Routing, Auth & Shared UI Components

### Part 8.1: API Clients, Context & Components
- [ ] **P8.1.1 Axios Client & Interceptors**: Configure Axios instance with `VITE_API_BASE_URL`, token injection interceptor, and 401 redirect to `/login`.
  - Depends on: P0.1.4
  - Original reference: `frontend/src/api/client.ts`
  - Done when: Authenticated API calls send Bearer token automatically.
- [ ] **P8.1.2 Typed API Modules**: Implement `matches.ts`, `problems.ts`, `series.ts`, and `users.ts`.
  - Depends on: P8.1.1
  - Original reference: `frontend/src/api/`
  - Done when: API methods return typed response data.
- [ ] **P8.1.3 AuthContext & Route Guards**: Implement `AuthContext` decoding JWT role (`ADMIN`/`USER`), and route guards (`ProtectedRoute`, `AdminRoute`).
  - Depends on: P8.1.2
  - Original reference: `frontend/src/auth/AuthContext.tsx`, `frontend/src/routes/`
  - Done when: Unauthenticated users are redirected from protected routes; non-admins blocked from `/admin/*`.
- [ ] **P8.1.4 Shared UI Components & Layout**: Implement `Layout.tsx` (top HUD navigation, scan lines, user info, logout), `DifficultyBadge.tsx`, and `SeriesCountdown.tsx`.
  - Depends on: P8.1.3
  - Original reference: `frontend/src/components/`
  - Done when: Navigation bar renders correctly and responds to authentication state.

> **Phase 8 Checkpoint**: Frontend shell renders with dark terminal layout; authentication state preserves across reloads; route guards protect private pages.

---

## Phase 9: Frontend Pages (Lobby, Bracket, Arena, Admin)

### Part 9.1: Public & User Pages
- [ ] **P9.1.1 Landing, Login & Register Pages**: Implement `LandingPage.tsx`, `LoginPage.tsx`, and `RegisterPage.tsx`.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/LandingPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`
  - Done when: Users can register new accounts and log in to obtain JWT.
- [ ] **P9.1.2 DashboardPage**: Implement dashboard with mission control HUD, join series CTA, quick problem list, and recent matches table.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/DashboardPage.tsx`
  - Done when: Authenticated user dashboard renders stats and quick links.
- [ ] **P9.1.3 SeriesListPage**: Implement paginated tournament list with slot fill bars, status pills, and countdown clocks.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/SeriesListPage.tsx`
  - Done when: Tournament series list displays active and upcoming tournaments.
- [ ] **P9.1.4 SeriesDetailPage & Bracket Visualizer**: Implement series detail page showing participant roster, countdown, and round-by-round match brackets.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/SeriesDetailPage.tsx`
  - Done when: Bracket shows matchups and allows eligible users to join.
- [ ] **P9.1.5 ProfilePage**: Implement operative profile displaying Elo rating, wins, losses, win rate progress bar, and 10 recent matches.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/ProfilePage.tsx`
  - Done when: Visiting `/profile/:username` renders user stats.

### Part 9.2: Match Arena & Admin Pages
- [ ] **P9.2.1 MatchPage Live Arena**: Implement Monaco Editor integration with Java/C++ templates, problem drawer, submit button, and STOMP WebSocket subscriber for `/topic/match/{id}`.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/MatchPage.tsx`
  - Done when: Code editor accepts input, submits to API, receives STOMP verdict, and updates HUD live.
- [ ] **P9.2.2 AdminProblemsPage & ProblemDetailPage**: Implement admin problem authoring form with testcase JSON editor and public problem viewer.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/AdminProblemsPage.tsx`, `ProblemDetailPage.tsx`
  - Done when: Admin creates problem; statement renders at `/problems/:id`.
- [ ] **P9.2.3 AdminCreateSeriesPage**: Implement admin tournament creation form with per-round problem selection.
  - Depends on: P8.1.4
  - Original reference: `frontend/src/pages/AdminCreateSeriesPage.tsx`
  - Done when: Admin can configure and launch a new 8 or 16 player series.

> **Phase 9 Checkpoint**: Full web application accessible in browser; competitors can participate in 1v1 duels inside Monaco editor and view live tournament brackets.

---

## Phase 10: End-to-End Verification, Performance & Polish

### Part 10.1: Verification & Testing
- [ ] **P10.1.1 Full 1v1 Duel Lifecycle Test**: Register two users, seed/start a match, submit Java code from Player 1, verify `ACCEPTED` verdict, confirm Player 1 win, and check Elo rating change (+10/-5).
  - Depends on: Phase 9
  - Original reference: Full stack
  - Done when: End-to-end match flow finishes with live winner announcement and updated ratings.
- [ ] **P10.1.2 8-Player Single Elimination Simulation**: Simulate 8-player series registration, scheduler kickoff, 4 quarterfinal matches, 2 semifinal matches, and 1 final match.
  - Depends on: P10.1.1
  - Original reference: Full stack
  - Done when: Series status transitions from `REGISTRATION_OPEN` to `COMPLETED` and champion is declared.
- [ ] **P10.1.3 One-Click Scripts & Documentation**: Provide `start-all.bat`, `start-infra.bat`, `start-backend.bat`, `start-frontend.bat`, and `stop-all.bat`.
  - Depends on: Phase 0 through Phase 9
  - Original reference: Root scripts
  - Done when: Running `start-all.bat` launches database, backend, and frontend without manual intervention.

> **Phase 10 Checkpoint**: Full application runs out of the box with zero errors, passing all acceptance criteria.
