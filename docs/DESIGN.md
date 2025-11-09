# TallyTracker — Design Document

## 1\) Overview

A minimal, single-file web app (`dist/index.html`) that lets a signed-in Google user define categories and log “I did X a total of Y times just now,” storing all data as a single JSON file in Google Drive at `appdata/TallyTracker/data.json`. The app emphasizes fast logging, editability, and goal tracking (daily/weekly/monthly/yearly), with simple visualizations and projections.

- Hosting: GitHub Pages.
- Files: `index.html` (inline JS/CSS/HTML), sibling `config.json` (OAuth Client ID).
- No frameworks, no build step required.
- Mobile-first, usable from desktop (Tailwind CSS based).
- Optional installable PWA (manifest via data URL; no service worker).

---

## 2\) Goals & Non-Goals

### Goals

- Simple, reliable logging of positive deltas per category with timestamps.
- Editable/deletable logs.
- Goal tracking & projection (how much per day to still hit goal).
- Lightweight visualizations of history and goal outcomes.
- All state persisted to a single Drive JSON file; read once at load, write on every change.
- Works only when signed in.

### Non-Goals

- Offline usage / sync between devices without reloading.
- Multi-user sharing, collaboration, or import/export.
- Advanced chart interactions (keep charts simple).

---

## 3\) Constraints & Assumptions

- **Data volume**: ≤100 categories; ≤50,000 logs per category.
- **Timestamps**: ISO 8601 without timezone (e.g., `2025-11-09T14:03:00`); always **displayed** in local device timezone.
- **Strict Drive reads**: Read from Drive at app load; no reliance on cached Drive data for correctness.
- **Local convenience**: `localStorage` may remember last used category and last delta for convenience only.

---

## 4\) User Flows

### 4.1 Sign-in / Initialization

1.  Load `config.json` to get `oauth_client`.
2.  Prompt Google sign-in (scope: `https://www.googleapis.com/auth/drive.file`).
3.  Ensure folder `appdata/TallyTracker/` exists (create if missing).
4.  Ensure `data.json` exists (create minimal skeleton if missing).
5.  Read `data.json` once; initialize in-memory store and UI.

**Failure states**

- Not signed in → block UI; show sign-in explainer and button.
- Drive read failure → retry with exponential backoff; if still failing, show blocking error.

### 4.2 Categories

- Create: name (emojis allowed in name), optional goal (type + target).
- Edit: rename name **only**. Goals cannot be edited after creation.
- Delete: requires typing the exact category name in a confirmation field; delete also removes its logs (irreversible).

### 4.3 Logging

Form with:

- **Category** (prefilled to last used via `localStorage`, required).
- **Delta** positive integer (prefilled to last used via `localStorage`, required).
- **Timestamp** (default now, editable for back-dated logging; future timestamps disallowed).
- **Note** (optional string; may be empty).

Actions:

- Submit → append log (positive delta only).
- Quick presets: buttons like `+1`, `+5`, `+10` that fill the delta field.
- Undo last action: toast/banner with “Undo” (reverts the most recent mutation by the current session).

### 4.4 Edit/Delete Logs

- Timeline (reverse chronological) per category with inline “Edit” and “Delete”.
- Editing allows changing delta, timestamp, note, or category (moving the log).
- Deleting removes the single log.

### 4.5 Visualization & Goals

Per category:

- **Progress card** for active goal:

  - Current cycle window (UTC aligned).
  - Accumulated delta this cycle vs target.
  - Status: on track / behind (with simple wording).
  - **Projection**: “To reach your {goal type} goal, you need about _Y per day_ on average from now to the cycle end.”

- **History**:

  - Simple **bar chart** of daily totals (last 30 days) or appropriate binning for weekly/monthly/yearly.
  - Simple **line chart** of cumulative total over selectable range (e.g., last 90 days).

- **Goal outcomes**:

  - Past cycles list (success/failed with totals).

- Charts are custom, tiny, canvas-based (no libraries), tooltips via hover.

---

## 5\) Data Model

All data is stored in a **single** JSON file at `appdata/TallyTracker/data.json`. Given size constraints, use a compact schema with short keys and tuple arrays for logs.

### 5.1 File Schema (minified-friendly)

```json
{
  "v": 1,
  "meta": {
    "created": "2025-11-09T14:00:00",
    "rev": 7
  },
  "cats": {
    "a": { "n": "Push-ups", "g": { "t": "D", "x": 50 } },
    "b": { "n": "Read 📚", "g": { "t": "M", "x": 600 } },
    "c": { "n": "Jogging", "g": null }
  },
  "logs": [
    /* tuple: [id, t, c, d, note?] */
    [1, "2025-11-09T07:12:00", "a", 20],
    [2, "2025-11-09T19:40:12", "a", 10, "evening set"],
    [3, "2025-11-08T21:15:00", "b", 20]
  ]
}
```

- `v`: schema version (integer).

- `meta.rev`: monotonically increasing local revision counter (for optimistic concurrency).

- `cats`: dictionary keyed by short **category id** (short stable strings like base36 or short uuids).

  - `n`: category name (string; max len reasonable—e.g., 80 for safety; UI enforces 50).

  - `g`: goal or `null`; when present:

    - `t`: type: `"D" | "W" | "M" | "Y"`.
    - `x`: positive integer target for the cycle.

- `logs`: array of log tuples (compact):

  - `id` (number): unique, monotonically increasing (per file).
  - `t` (string): ISO8601 without timezone (UTC-naive string).
  - `c` (string): category id.
  - `d` (number): positive delta.
  - `note` (string, optional; omit key by using sparse tuple).

**Notes on size minimization**

- Short keys (`v`, `cats`, `logs`, `n`, `g`, `t`, `x`, `d`) and tuple arrays for logs.
- Category ids are short strings to avoid long repeats.
- Omit optional fields entirely when empty (e.g., `note`).

### 5.2 Derived Computations (in-memory)

- Per category totals over arbitrary ranges (reduce over `logs`).

- Goal cycle windows (UTC-aligned):

  - Daily: from `YYYY-MM-DDT00:00:00` UTC today to next day.
  - Weekly: Monday `00:00:00` UTC to next Monday.
  - Monthly: 1st `00:00:00` UTC to next month’s 1st.
  - Yearly: Jan 1st `00:00:00` UTC to next Jan 1st.

- When a goal is **first set mid-cycle**, progress starts counting from the start of the **current** cycle (not from goal creation time), per requirement.

---

## 6\) Persistence & Sync

### 6.1 Drive Location & Scopes

- Folder: `appdata/TallyTracker/` (create if missing).
- File: `data.json` (create if missing with skeleton).
- MIME type: `application/json`.
- Scope: `drive.file`.

### 6.2 Read/Write Strategy

- **Read once on load** → populate store.

- **Write on every mutation** (category create/edit/delete; log add/edit/delete; undo) by:

  1.  Fetch current `revisionId` (or `modifiedTime`) / ETag.
  2.  Compare with last-known; if mismatch, **reload file**, reapply the pending mutation locally, and retry write.
  3.  On success, bump `meta.rev` and persist.

### 6.3 Concurrency & Conflicts

- Optimistic concurrency with one-at-a-time mutations:

  - Keep a small **pending queue** to serialize writes.
  - If concurrent edit detected (newer revision on Drive), **reload** then reapply pending changes.

- Given logs are deltas and categories are keyed dicts, merge conflicts are unlikely; renames and deletes operate on ids, not names.

### 6.4 Retry Policy

- Exponential backoff: 0.5s, 1s, 2s, 4s (cap \~5 tries).
- Show inline error toast if retries exhausted; keep UI usable but block further writes until a manual “Try again” reload.

---

## 7\) Security & Access

- App is unusable without sign-in. All UI is gated behind auth.
- Only `drive.file` scope; app accesses files it created or that the user grants picker access to (not used here).
- No telemetry or third-party data flows.

---

## 8\) UI/UX

### 8.1 Layout

- **Header**: App title, theme toggle (light/dark), user avatar/sign-out.

- **Main**: Two tabs:

  - **Log**: quick logging form, quick presets, undo toast; recent logs list for the selected category.
  - **Insights**: per-category goal card, projection, simple charts, past goal outcomes.

### 8.2 Log Screen

- Category selector (searchable dropdown; prefilled to last used).
- Delta input (integer; prefilled to last used) + quick preset buttons.
- Timestamp input (defaults to now; prevents future).
- Optional note field.
- Submit button triggers “Saved” toast with **Undo**.
- Recent logs list (today + yesterday) with edit/delete inline.

### 8.3 Category Management

- List with create button.
- Each row: name, goal summary (e.g., “Weekly: 5”), edit, delete.
- Delete opens modal with conspicuous warning. Requires typing the category name to confirm.

### 8.4 Insights Screen

- **Goal Progress Card**:

  - Current cycle window (converted and displayed in **local timezone**).
  - Accumulated vs target; simple status (on track/behind).
  - Projection: average per remaining day to hit goal.

- **Charts** (canvas):

  - Daily bars (last 30 days or appropriate bin size).
  - Cumulative line (last 90 days).
  - Past cycle outcomes: compact list of ✅/❌ with totals.

### 8.5 Theming

- Light/dark with CSS variables; follow system by default with a toggle to override (stored in `localStorage`).

### 8.6 Accessibility

- Basic focus order and keyboard operation for forms (no extensive ARIA work required per scope).

---

## 9\) Time & Goal Calculations

- **Storage**: timestamps are timezone-naive ISO strings.

- **Display**: always convert to local device timezone for rendering.

- **Goal windows**: computed **in UTC**:

  - Daily: `[UTC 00:00, next UTC 00:00)`.
  - Weekly: Monday `[00:00 UTC, next Monday 00:00 UTC)`.
  - Monthly: 1st `[00:00 UTC, next 1st 00:00 UTC)`.
  - Yearly: Jan 1 `[00:00 UTC, next Jan 1 00:00 UTC)`.

- **Projection**:

  - Let `R` = remaining required total = `target - achievedSoFar`.
  - Let `D` = number of **whole** days remaining in the cycle (UTC boundary–based), but display guidance “per day” in user’s local view.
  - Needed per day ≈ `ceil(max(R,0) / max(D,1))`.

---

## 10\) PWA (Optional, minimal)

- Add a **data URL manifest** via `<link rel="manifest" href="data:application/manifest+json,...">`.
- Icons can be embedded as data URLs in the manifest.
- No service worker (keeps single-file constraint). App can still be installable; offline not supported.

---

## 11\) Error Handling

- **Auth required**: Blocker screen with explanation and sign-in button.
- **Drive folder/file missing**: create; if failure → show blocking error with retry.
- **Read failure**: retries with backoff → blocking error with manual retry.
- **Write failure**: retries; on conflict, reload + replay; if still failing, show non-dismissable error and disable mutation actions until resolved.

---

## 12\) Performance Considerations

- Keep in-memory index by category id to compute aggregates quickly:

  - Map: `catId -> array of logs` (references into `logs`).
  - Precompute daily buckets for last N days upon category selection.

- Rendering:

  - Virtualize long lists (logs) per category to maintain snappy UI.

- JSON size:

  - Compact keys & tuples; omit optional fields; no pretty printing.

---

## 13\) Validation Rules

- Category name: non-empty, trimmed, ≤50 chars; uniqueness enforced (case-insensitive) **by id** (ids are unique; renames don’t change id).
- Goal target: positive integer.
- Log delta: positive integer.
- Log timestamp: ISO 8601 without timezone; must be ≤ “now” (local time converted to UTC boundary check).
- Editing logs: same constraints as creation.

---

## 14\) Undo Model

- Maintain a single “last mutation” snapshot with inverse operation:

  - Add log → inverse = delete log by id.
  - Edit log → inverse = restore previous tuple.
  - Delete log → inverse = reinsert tuple at original position.
  - Category create → inverse = delete category (and logs if any).
  - Category edit (name) → inverse = restore previous name.
  - Category delete → inverse = restore category + all removed logs.

- Undo availability expires after next successful mutation or after \~20s timeout.

---

## 15\) Security & Privacy

- Only `drive.file` scope; all data resides in the user’s Drive.
- No third-party analytics; no data leaves Google APIs and the user’s browser.
- Sign-out clears in-memory state (optionally clear local convenience prefs).

---

## 16\) Testing & Deployment

- Serve via GitHub Pages over HTTPS.

- Verify OAuth client’s authorized JavaScript origins include the Pages domain.

- Manual tests:

  - First-run path (folder/file creation).
  - Conflict handling by simulating two tabs (ensure reload + replay).
  - Goal edge cases (mid-cycle start, end-of-cycle projections).
  - Large datasets (simulate near-limit logs).

---

## 17\) Future Enhancements (out of scope)

- Multiple goal types per category; streaks and habit chains.
- Import/export; CSV preview.
- Service worker for offline and faster loads.
- Shared categories across users.

---

## 18\) Minimal Skeleton for `data.json` on First Run

```json
{
  "v": 1,
  "meta": { "created": "<set at creation>", "rev": 0 },
  "cats": {},
  "logs": []
}
```

---

## 19\) Config File

`dist/config.json`:

```json
{
  "oauth_client": "<YOUR_GOOGLE_OAUTH_CLIENT_ID>"
}
```

---

## 20\) Key Implementation Notes (non-code)

- Use Google API JS client for OAuth and Drive.
- On every mutation: read latest `revisionId`/ETag before PUT to detect conflicts; if mismatch, reload file and replay.
- Keep UI responsive; disable submit during an active save; show clear status toasts.
