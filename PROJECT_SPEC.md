# PROJECT_SPEC.md — AlgoClash Functional & Technical Specification

This document defines the complete product and engineering specification for **AlgoClash**, a real-time 1v1 competitive programming platform and automated single-elimination tournament system.

---

## 1. Vision and Purpose
- **Problem Solved**: Traditional competitive programming platforms (e.g. LeetCode, Codeforces) focus primarily on asynchronous problem-solving or massive asynchronous contests. AlgoClash solves the need for **instantaneous, low-latency, head-to-head (1v1) competitive dueling** combined with **automated single-elimination tournament orchestration** and real-time live spectator/duel state updates.
- **Target Users**:
  - **Competitors**: Programmers seeking real-time head-to-head coding battles with immediate verdicts and persistent competitive rating.
  - **Administrators**: Organizers who author algorithmic problems with hidden test suites and schedule tournament series.

---

## 2. Complete Feature List

### F1: User Identity & Authentication
- **Registration**: Allows new users to create accounts with unique `username`, unique `email`, and a raw password (hashed via BCrypt). Default role: `USER`, starting rating: `1000`. Returns a signed JWT token valid for 24 hours.
- **Login**: Accepts `usernameOrEmail` and `password`. Validates credentials against Spring Security, issuing a signed HMAC-SHA256 JWT containing `sub` (username) and claim `role` (`USER` or `ADMIN`).
- **Authorization & RBAC**: Stateless authentication via `Authorization: Bearer <token>`. Role enforcement: Public endpoints (`/api/auth/**`, `/api/problems/**` GET, `/api/series/**` GET), Admin-only endpoints (`/api/problems` POST, `/api/series` POST), and Authenticated user endpoints (`/api/series/*/join`, `/api/matches/**`, `/api/users/**`).

### F2: Problem Authoring & Repository
- **Problem Creation (Admin)**: Form to define `title`, `description` (Markdown), `difficulty` (`EASY`, `MEDIUM`, `HARD`), `timeLimitMillis` (default 1000), `memoryLimitMb` (default 256), optional `sampleInput`, optional `sampleOutput`, and `testcasesJson` (JSON array of `{"input": "...", "output": "..."}`).
- **Problem Catalog & Details**: Browse problems list (`GET /api/problems`) and view full problem statements with execution limits and sample I/O (`GET /api/problems/{id}`).

### F3: Tournament (Series) Management & Progression
- **Series Creation (Admin)**: Admin configures `name`, power-of-2 `size` (8, 16, 32, etc.), future start timestamp `startsAt`, and an explicit mapping of problem IDs for every round (`roundProblems: { 1: pId, 2: pId, ... }`).
- **Series Browsing & Discovery**: Paginated tournament listing (`GET /api/series?page=0&size=20&sort=id,desc`) showing slots filled, current status, and kickoff time.
- **Series Registration**: Users join open tournaments (`POST /api/series/{id}/join`). When `joinedCount == size`, status automatically transitions from `REGISTRATION_OPEN` to `REGISTRATION_CLOSED`.
- **Scheduled Kickoff**: Background scheduler (`SeriesScheduler`) checks every 10 seconds for series where `startsAt <= now` and registration is closed:
  - Generates Round 1 bracket via `SingleEliminationBracketStrategy` (shuffles participants randomly and creates pair-wise matches).
  - Activates Series and Round 1 matches to `ONGOING`.
- **Automated Round Progression**: Listens for `MatchCompletedEvent`. Once all matches in a round finish:
  - Collects round winners.
  - If current round is the final (`round == log2(size)`), marks series as `COMPLETED`.
  - Otherwise, retrieves the next round's problem from `SeriesRoundConfig`, generates next-round matches, increments `currentRound`, and persists the next bracket.
- **Match Timeout Sweeper**: Cancels any `ONGOING` matches running longer than 2 hours to avoid blocked tournaments.

### F4: 1v1 Match Arena & Real-time Duel Experience
- **Access Control**: A match can only be loaded if the authenticated user is either `player1` or `player2`, and the match state is `ONGOING` or `COMPLETED`.
- **Match Arena HUD**:
  - Displays match ID, round number, Player 1 vs Player 2, and winner tag if completed.
  - Collapsible problem drawer displaying statement, time limit, memory limit, and sample I/O.
  - Live status indicator (PENDING, ONGOING, COMPLETED).
- **In-Browser IDE**: Monaco Editor configured with boilerplate code for **Java** (`Main` class with `public static void main`) and **C++** (`#include <bits/stdc++.h>` with `ios::sync_with_stdio(false)`).
- **Code Submission**: Competitor submits solution via `POST /api/matches/{id}/submissions`.
- **Asynchronous Remote Judging**: Backend calls external **Judge0** execution cluster asynchronously (`@Async`), passing source code, language ID (`JAVA` = 91, `CPP` = 54), test case stdin, and expected stdout.
- **Verdict Aggregation**: Evaluates each testcase sequentially. First non-accepted status determines final verdict:
  - `ACCEPTED` (Judge0 status 3)
  - `WRONG_ANSWER` (Judge0 status 4)
  - `TIME_LIMIT_EXCEEDED` (Judge0 status 5)
  - `COMPILATION_ERROR` (Judge0 status 6)
  - `RUNTIME_ERROR` (Judge0 statuses 7-12)
  - `INTERNAL_ERROR` (Judge0 unreachable / circuit open / empty test cases)
- **STOMP WebSocket Live Updates**: Verdict updates are pushed over WebSocket broker to destination `/topic/match/{matchId}`. Both clients in the duel receive live verdict badges without polling.
- **Atomic Match Finalization**:
  - The first competitor to achieve `ACCEPTED` triggers match finalization.
  - Acquisition of a **Pessimistic Write Lock** (`findByIdForUpdate`) inside an independent transaction (`Propagation.REQUIRES_NEW`) ensures only the first accepted submission is awarded the win, eliminating concurrency race conditions.
  - Publishes `MatchCompletedEvent` to trigger post-match updates.

### F5: Rating & Competitive Profiles
- **Elo-style Rating System**:
  - Winner receives **+10 rating** and **+1 win**.
  - Loser receives **-5 rating** (floored at `0`) and **+1 loss**.
- **Player Profiles**: `GET /api/users/username/{username}/profile` returns total rating, wins, losses, win rate percentage, and the 10 most recent matches (opponent username, round, tournament series name, result: WIN/LOSS/PENDING, timestamp).

---

## 3. User Flows & Edge Cases

### Flow 1: User Onboarding & Login
1. User navigates to `/register`, inputs `username`, `email`, and `password`.
2. Frontend calls `POST /api/auth/register`.
   - *Error Path*: If username or email exists, backend throws 500/Runtime exception with message `"An account with those credentials already exists"`. UI shows error banner.
3. On success, backend returns `{ token: "..." }`. Frontend stores token in `localStorage['ac_token']` and updates `AuthContext`.
4. User logs in at `/login` with `usernameOrEmail` and `password`.
   - *Error Path*: Invalid credentials return `401 Unauthorized`. Frontend displays `"Login failed"`.

### Flow 2: Tournament Lifecycle (Creation to Completion)
1. **Admin Creation**: Admin navigates to `/admin/series/create`, enters series name, picks tournament size (8 or 16), sets kickoff date/time (must be future), and assigns a problem for each round.
   - *Error Path*: Missing round problems or past timestamp returns `400 Bad Request`.
2. **Player Registration**: Competitors visit `/series`, select the series, and click `"Join Tournament"`.
   - *Error Path*: Joining when not logged in redirects to `/login`. Joining twice returns `400 "You already joined this series"`. Joining a full tournament returns `400 "Series is already full"`.
3. **Registration Closes**: When participant count reaches `size`, series status transitions to `REGISTRATION_CLOSED`.
4. **Kickoff**: Scheduler detects `startsAt` passed. Shuffles participants randomly, generates Round 1 matches with Round 1's problem, and sets series to `ONGOING`.
5. **Duel Execution**: Competitors enter `/match/{id}`. Both submit code.
6. **Verdict & Winner Settlement**:
   - Competitor 1 submits correct code. Judge0 verifies all test cases pass.
   - Backend acquires pessimistic lock on match row. Sets `match.winner = Player1`, `match.state = COMPLETED`.
   - Event listener adds +10 to Player 1 rating, -5 to Player 2 rating.
   - STOMP message is broadcast to `/topic/match/{id}`. Monaco editor disables submit button. UI displays winner announcement.
7. **Bracket Progression**:
   - `SeriesProgressionService` checks all matches in Round 1.
   - Once all Round 1 matches are `COMPLETED`, pairs the winners into Round 2 matches using the problem configured for Round 2.
   - Increments `series.currentRound` to 2.
   - Repeats until final round winner is decided; series status set to `COMPLETED`.

---

## 4. Functional & Non-Functional Requirements

### Functional Requirements
- **FR-01**: Passwords must be hashed using BCrypt.
- **FR-02**: JWT tokens must be signed with HS256 and include username (`sub`) and role (`role`).
- **FR-03**: Tournament sizes must be powers of 2 (enforced via `size >= 2 && (size & (size - 1)) == 0`).
- **FR-04**: Problem test cases must be stored as JSON arrays containing `input` and `output` strings.
- **FR-05**: Match access must be restricted to match participants; non-participants receive `403 Forbidden`.
- **FR-06**: Inactive matches (state `PENDING`) cannot be accessed via `GET /api/matches/{id}`; returns `400 Bad Request`.
- **FR-07**: Submissions to already completed matches must be rejected with `400 Bad Request`.
- **FR-08**: Multi-language execution must map: Java → Judge0 Language ID `91`, C++ → Judge0 Language ID `54`.
- **FR-09**: Resilience4j Retry (3 attempts, 500ms backoff) and Circuit Breaker (sliding window 5, 80% failure threshold, 30s open state) must wrap Judge0 client calls.
- **FR-10**: Every HTTP request must have an `X-Request-Id` correlation header propagated to SLF4J MDC.

### Non-Functional Requirements
- **NFR-01 (Concurrency Safety)**: Pessimistic write lock on match finalization prevents concurrent submissions from claiming dual wins.
- **NFR-02 (Low Latency)**: Real-time match verdicts delivered via WebSocket within 500ms of judge evaluation completion.
- **NFR-03 (Stateless Scalability)**: Spring Security must run in stateless session mode (`SessionCreationPolicy.STATELESS`).
- **NFR-04 (Type Safety)**: Complete TypeScript interface coverage on frontend matching backend DTO definitions.

---

## 5. Data Models & Entity Schemas

### Entity 1: `User` (table: `users`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | PK, Auto-increment | User identifier |
| `username` | `VARCHAR(255)` | NOT NULL, UNIQUE | Handle |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Email address |
| `password_hash` | `VARCHAR(255)` | NOT NULL | BCrypt hash |
| `rating` | `INT` | NOT NULL, Default `1000` | Elo rating |
| `wins` | `INT` | NOT NULL, Default `0` | Win counter |
| `losses` | `INT` | NOT NULL, Default `0` | Loss counter |
| `role` | `VARCHAR(32)` | NOT NULL, Enum: `USER`, `ADMIN` | Authorization role |
| `created_at` | `TIMESTAMP` | NOT NULL | Auto `@PrePersist` |

### Entity 2: `Problem` (table: `problems`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | PK, Auto-increment | Problem identifier |
| `title` | `VARCHAR(255)` | NOT NULL | Problem title |
| `description` | `VARCHAR(10000)` | NOT NULL | Full markdown statement |
| `difficulty` | `VARCHAR(32)` | NOT NULL, Enum: `EASY`, `MEDIUM`, `HARD` | Difficulty level |
| `time_limit_millis` | `INT` | NOT NULL, Default `1000` | Execution time limit (ms) |
| `memory_limit_mb` | `INT` | NOT NULL, Default `256` | RAM limit (MB) |
| `sample_input` | `TEXT` | Nullable | Public sample stdin |
| `sample_output` | `TEXT` | Nullable | Public sample stdout |
| `testcases_json` | `TEXT` | NOT NULL | Array of `{"input": "...", "output": "..."}` |
| `created_by_id` | `BIGINT` | FK -> `users(id)`, Nullable | Author user |
| `created_at` / `updated_at` | `TIMESTAMP` | NOT NULL | Timestamps |

### Entity 3: `Series` (table: `series`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | PK, Auto-increment | Series identifier |
| `name` | `VARCHAR(255)` | NOT NULL | Tournament name |
| `size` | `INT` | NOT NULL | Number of participants (8, 16...) |
| `status` | `VARCHAR(32)` | NOT NULL, Enum: `CREATED`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `ONGOING`, `COMPLETED` | Lifecycle status |
| `current_round` | `INT` | NOT NULL, Default `1` | Active round index |
| `starts_at` | `TIMESTAMP` | Nullable | Kickoff timestamp |
| `created_at` / `updated_at` | `TIMESTAMP` | NOT NULL | Timestamps |
- **Relationship**: Many-to-Many `participants` mapped via join table `series_participants(series_id, user_id)`.

### Entity 4: `SeriesRoundConfig` (table: `series_round_config`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | PK, Auto-increment | Config identifier |
| `series_id` | `BIGINT` | FK -> `series(id)`, NOT NULL | Series reference |
| `round_number` | `INT` | NOT NULL | Round index (1, 2, 3...) |
| `problem_id` | `BIGINT` | FK -> `problems(id)`, NOT NULL | Problem assigned to round |
- **Constraint**: Unique constraint on `(series_id, round_number)`.

### Entity 5: `Match` (table: `matches`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | PK, Auto-increment | Match identifier |
| `series_id` | `BIGINT` | FK -> `series(id)`, NOT NULL | Tournament reference |
| `problem_id` | `BIGINT` | FK -> `problems(id)`, NOT NULL | Assigned problem |
| `player1_id` | `BIGINT` | FK -> `users(id)`, NOT NULL | Player 1 |
| `player2_id` | `BIGINT` | FK -> `users(id)`, NOT NULL | Player 2 |
| `winner_id` | `BIGINT` | FK -> `users(id)`, Nullable | Winner user |
| `round` | `INT` | NOT NULL | Round number |
| `state` | `VARCHAR(32)` | NOT NULL, Enum: `PENDING`, `ONGOING`, `COMPLETED`, `CANCELLED` | Lifecycle state |
| `started_at` | `TIMESTAMP` | Nullable | Match start time |
| `ended_at` | `TIMESTAMP` | Nullable | Match end time |
| `created_at` / `updated_at` | `TIMESTAMP` | NOT NULL | Timestamps |

### Entity 6: `Submission` (table: `submissions`)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | PK, Auto-increment | Submission identifier |
| `match_id` | `BIGINT` | FK -> `matches(id)`, NOT NULL (`@JsonIgnore`) | Match reference |
| `user_id` | `BIGINT` | FK -> `users(id)`, NOT NULL (`@JsonIgnore`) | Submitter user |
| `language` | `VARCHAR(32)` | NOT NULL, Enum: `JAVA`, `CPP` | Language |
| `code` | `TEXT` | NOT NULL | Source code |
| `verdict` | `VARCHAR(32)` | NOT NULL, Enum: `PENDING`, `ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `INTERNAL_ERROR` | Judgment verdict |
| `created_at` | `TIMESTAMP` | NOT NULL | Submission timestamp |

---

## 6. API Specifications & Interfaces

### 6.1 Authentication (`/api/auth`)
- **`POST /api/auth/register`**
  - Public
  - Body: `{ "username": "...", "email": "...", "password": "..." }`
  - Response: `200 OK` `{ "token": "..." }`
- **`POST /api/auth/login`**
  - Public
  - Body: `{ "usernameOrEmail": "...", "password": "..." }`
  - Response: `200 OK` `{ "token": "..." }`

### 6.2 Problems (`/api/problems`)
- **`GET /api/problems`**: Public. Returns `List<ProblemResponse>`.
- **`GET /api/problems/{id}`**: Public. Returns `ProblemResponse`.
- **`POST /api/problems`**: Admin only (`hasRole('ADMIN')`).
  - Body:
    ```json
    {
      "title": "Two Sum",
      "description": "Problem markdown...",
      "difficulty": "EASY",
      "timeLimitMillis": 1000,
      "memoryLimitMb": 256,
      "sampleInput": "2 3",
      "sampleOutput": "5",
      "testcasesJson": "[{\"input\":\"2 3\\n\",\"output\":\"5\\n\"}]"
    }
    ```
  - Response: `200 OK` `ProblemResponse`.

### 6.3 Series (`/api/series`)
- **`GET /api/series?page=0&size=20&sort=id,desc`**: Public. Returns Spring Data `Page<SeriesSummaryResponse>`.
- **`GET /api/series/{id}`**: Public. Returns `SeriesDetailResponse` (includes `participants` list and `rounds` with match summaries).
- **`POST /api/series`**: Admin only.
  - Body:
    ```json
    {
      "name": "Spring Clash",
      "size": 8,
      "startsAt": "2026-03-01T18:00:00Z",
      "roundProblems": { "1": 1, "2": 2, "3": 3 }
    }
    ```
  - Response: `201 Created` `SeriesSummaryResponse`.
- **`POST /api/series/{id}/join`**: Authenticated. Returns updated `SeriesDetailResponse`.

### 6.4 Matches (`/api/matches`)
- **`GET /api/matches/{id}`**: Authenticated (must be `player1` or `player2`, state must be `ONGOING` or `COMPLETED`).
  - Response: `MatchResponse` (includes problem details, opponent username, match state, and current user's latest submission status).
- **`POST /api/matches/{matchId}/submissions`**: Authenticated (participant only).
  - Body: `{ "language": "JAVA", "code": "..." }`
  - Response: `200 OK` `SubmissionResponse` with `verdict: "PENDING"`.

### 6.5 Users (`/api/users`)
- **`GET /api/users`**: Authenticated. Returns `List<User>`.
- **`GET /api/users/username/{username}/profile`**: Authenticated. Returns `UserProfileResponse` (stats + 10 recent matches).
- **`POST /api/users/seed`**: Public utility. Seeds `testuser`.

### 6.6 Dev Utilities (`/api/dev`)
- **`POST /api/dev/seed-match`**: Authenticated. Auto-seeds 2 users, demo problem, demo series, and pending Match #1.

### 6.7 WebSocket STOMP Protocol
- **Endpoint**: `/ws-algoclash` (SockJS enabled).
- **Topic Subscription**: `/topic/match/{matchId}`
- **Message Payload**:
  ```json
  {
    "id": 10,
    "matchId": 1,
    "userId": 2,
    "language": "JAVA",
    "verdict": "ACCEPTED",
    "createdAt": "2026-10-18T17:00:00"
  }
  ```

---

## 7. UI / UX Design Specifications
- **Design Aesthetic**: Void terminal / Cyberpunk HUD with pitch black backgrounds (`#000000`), subtle neon cyan matrix grids (`rgba(0, 255, 204, 0.02)`), mono-spaced fonts, and glowing status pills.
- **Top Navigation Bar**: Sticky, fixed 48px height with logo (`ALGOCLASH`), status indicators, navigation links (`Dashboard`, `Series`, `Profile`, and Admin links `Problems`, `New Series`), and Logout button.
- **Match Arena Layout (`/match/:id`)**:
  - Top HUD: Match round, `P1 vs P2`, live winner indicator, problem toggle button, real-time verdict chip with spinner during judging, and match state.
  - Split Workspace:
    - Left (collapsible): Problem statement, difficulty badge, memory/time tiles, sample inputs/outputs.
    - Right: Language selector (`JAVA` / `CPP`), code templates, Monaco Editor (`theme: vs-dark`), error banner, and Submit button.

---

## 8. Business Rules, Validations & Edge Cases
1. **Bracket Size**: Only power-of-2 series sizes supported ($size \ge 2$ and $(size \& (size - 1)) == 0$). An 8-player series has 3 rounds ($2^3=8$); a 16-player series has 4 rounds ($2^4=16$).
2. **Kickoff Readiness**: A series only starts if `startsAt <= now` **AND** `participants.size() == size`. If not full at kickoff time, it remains `REGISTRATION_OPEN`.
3. **Pessimistic Winner Lock**: When a player receives `ACCEPTED`, `MatchFinalizationService` executes `SELECT ... FOR UPDATE`. If another submission simultaneously evaluated to `ACCEPTED`, it checks `match.getState() == COMPLETED || match.getWinner() != null` and safely exits without overwriting the winner.
4. **Rating Bounds**: Loser rating is docked 5 points but cannot fall below 0 (`Math.max(0, rating - 5)`).
5. **Circuit Breaker on Judge0**: If Judge0 returns 5 consecutive failures, circuit opens for 30 seconds; submissions during this time fail fast with `INTERNAL_ERROR` rather than hanging threads.

---

## 9. External Services & Integrations
- **Judge0 CE API**:
  - `POST /submissions?base64_encoded=false&wait=true`
  - Payload: `{ "language_id": <int>, "source_code": "...", "stdin": "...", "expected_output": "..." }`
  - Language IDs: Java 17 = `91`, C++ (GCC 9.2.0) = `54`.
  - Status Codes: 3 = Accepted, 4 = Wrong Answer, 5 = Time Limit Exceeded, 6 = Compilation Error, 7-12 = Runtime Errors.

---

## 10. "Must Match the Original" Checklist
- [x] Initial admin seeded on first startup: `admin` / `admin123` with `ROLE_ADMIN` and rating `1500`.
- [x] Login request payload field name must be `usernameOrEmail` (not `username`).
- [x] Default user rating on register: `1000`.
- [x] Rating delta: +10 for win, -5 for loss (min 0).
- [x] JWT expiration default: 24 hours.
- [x] WebSocket endpoint at `/ws-algoclash`, broadcasting to `/topic/match/{matchId}`.
- [x] Match access strictly guarded: only players of that match can view it, and only when `ONGOING` or `COMPLETED`.
- [x] Match cancellation timeout: ongoing matches older than 2 hours are marked `CANCELLED`.
- [x] Single elimination bracket pairing: random shuffle on round 1; winners paired sequentially in subsequent rounds.

---

## 11. Out of Scope & Known Limitations
- Social logins (OAuth2 / GitHub / Google) are not implemented.
- Double elimination and Swiss bracket strategies are not yet implemented (bracket strategy interface supports them, but only `SingleEliminationBracketStrategy` exists).
- Python and JavaScript code execution are not in the current language enum (`SubmissionLanguage` only defines `JAVA` and `CPP`).
- Rating history over time (only total wins/losses and current rating are stored).

---

## 12. Open Questions & Ambiguities
- **UNCLEAR: Match Timeout Tie-Breaking**: When `SeriesScheduler.cancelTimedOutMatches()` marks a match as `CANCELLED`, neither player is assigned as winner (`winner_id` remains `null`). It is unclear how `SeriesProgressionService` should advance the tournament when a match in a round is cancelled (it currently waits for all matches to have `winner != null`, which means a cancelled match could stall tournament advancement unless an admin intervenes).
