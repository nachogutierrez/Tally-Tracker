# TallyTracker Implementation Milestones

## Milestone 1: Project Scaffold & Google Drive Authentication

**Goal:** Initialize the single-file app, set up Google OAuth, and establish basic read/write connectivity to Google Drive AppData folder.

**Tasks:**

1.  Create `index.html` with standard HTML5 boilerplate and include Tailwind CSS via CDN for styling.
2.  Create `config.json` to hold the Google OAuth Client ID.
3.  Implement Google Identity Services (GIS) authentication flow requesting `https://www.googleapis.com/auth/drive.file` scope.
4.  On successful sign-in:
    - Check if `appdata/TallyTracker/` folder exists on Drive. Create if missing.
    - Check if `data.json` exists in that folder. If missing, create it with the skeleton: `{"v":1, "meta":{"rev":0}, "cats":{}, "logs":[]}`.
    - Read the content of `data.json` and display it raw in a `<pre>` tag on the page to confirm connectivity.
5.  Implement a basic "Sign Out" button that revokes the token and clears the display.

**Success Criteria:**

- User can sign in with Google.
- App successfully creates standard folder/file structure in Drive if it doesn't exist.
- App displays the JSON content from Drive after sign-in.

---

## Milestone 2: Data Model & Category Management

**Goal:** Implement the in-memory data structure and full CRUD operations for Categories.

**Tasks:**

1.  Replace raw JSON display with a main UI framework (Header with user info, main content area).
2.  Implement the internal data store that holds the `data.json` structure in memory.
3.  Create the "Categories" management view:
    - **List:** Show all existing categories.
    - **Create:** Form to add a new category with Name and optional Goal (Type: Daily/Weekly/Monthly/Yearly, Target: integer). Generate short, unique IDs for categories.
    - **Edit:** Allow renaming categories (Goals are immutable after creation per design).
    - **Delete:** irreversible deletion of a category (and its associated logs, though we have none yet).
4.  Implement the **Persistence Layer**: On any category change, increment `meta.rev` and overwrite `data.json` on Drive.

**Success Criteria:**

- User can create, edit (name only), and delete categories.
- Changes persist to Google Drive immediately.
- Reloading the page retains category data.

---

## Milestone 3: Logging & History

**Goal:** Implement the core core logging functionality using the compact tuple storage format.

**Tasks:**

1.  Create the "Log" tab/view as the default home screen.
2.  Implement the **Logging Form**:
    - Category dropdown (populate from store).
    - Delta input (positive integer only).
    - Timestamp input (`datetime-local`, defaulting to now).
    - Optional Note input.
    - Quick Preset buttons (+1, +5, etc.) that auto-fill the Delta input.
3.  On submit, append a new log tuple `[id, timestamp(ISO8601-naive), catId, delta, note?]` to the in-memory store and trigger a Drive save.
4.  Implement **Recent History**:
    - Display logs in reverse chronological order below the form.
    - Group them by "Today", "Yesterday", and older.
5.  Implement **Edit/Delete Log** actions in the history list. Editing triggers a save; deleting removes the tuple.
6.  _(Bonus)_: Use `localStorage` to remember the last selected category and delta for user convenience.

**Success Criteria:**

- User can log activities with different timestamps and notes.
- Data is saved to Drive using the compact tuple format specified in DESIGN.md.
- User can edit or delete previous logs.

---

## Milestone 4: Goal Computation Engine

**Goal:** Implement the robust date math required to track progress against Daily, Weekly, Monthly, and Yearly goals.

**Tasks:**

1.  Implement time utility functions to calculate UTC-aligned cycle start/end dates based on a given local timestamp.
    - _Daily:_ UTC 00:00 to next UTC 00:00.
    - _Weekly:_ Monday 00:00 UTC to next Monday.
    - _Monthly:_ 1st of month 00:00 UTC.
    - _Yearly:_ Jan 1st 00:00 UTC.
2.  Create the "Insights" tab.
3.  For each category with a goal, render a **Goal Progress Card**:
    - Calculate total delta for the current cycle.
    - Display progress (e.g., "40 / 50 Weekly").
    - Determine status: "On Track" or "Behind".
4.  Implement the **Projection** math:
    - Calculate remaining target needed.
    - Calculate remaining days in the UTC cycle.
    - Display: "Need avg X per day to hit goal."

**Success Criteria:**

- Goals accurately reset at UTC boundaries (verifiable by changing system time or logging past dates).
- Projections accurately reflect remaining needed effort divided by remaining days.

---

## Milestone 5: Visualizations (Canvas)

**Goal:** Add lightweight, no-library charts to the Insights view.

**Tasks:**

1.  Implement a raw `<canvas>` based **Bar Chart** component:
    - Shows daily totals for a selected category for the last 30 days.
    - Auto-scales Y-axis based on max value in range.
2.  Implement a raw `<canvas>` based **Line Chart** component:
    - Shows cumulative total over the last 90 days for a category.
3.  Add basic hover tooltips to charts to show exact values on specific days.
4.  Integrate these charts into the Category detail view within the Insights tab.

**Success Criteria:**

- Clean, responsive charts rendered without external charting libraries.
- Charts accurately reflect log data.

---

## Milestone 6: Robustness, Polish & PWA

**Goal:** Finalize the app with advanced data integrity features, undo capability, and offline-installability.

**Tasks:**

1.  **Conflict Resolution:** Update the Drive write/save function to check the file's current `revisionId` (or ETag) before writing. If it changed since last read, reload data, re-apply local changes, and retry write.
2.  **Undo:** Implement a global "Toast" notification system. On any mutation (Log add/edit/delete, Cat changes), push the inverse operation to an undo stack (length 1) and show the "Undo" button for 20 seconds.
3.  **PWA:** Add a standard `manifest.json` (can be inline data-uri if strictly adhering to single-file, or a separate file if permissible by hosting) to allow "Add to Home Screen" functionality on mobile.
4.  **Theming:** Implement Light/Dark mode toggle using CSS variables and Tailwind's `dark:` prefix, persisting preference to `localStorage`.

**Success Criteria:**

- Simultaneous edits in two tabs don't overwrite each other (tested via conflict resolution).
- Undo successfully reverts the last action.
- App is installable on mobile devices as a PWA.
