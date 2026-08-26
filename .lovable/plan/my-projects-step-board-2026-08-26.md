# My Projects step board

## Goal
Turn each project’s step list in **My Projects** into a compact three-column board: **To do**, **In progress**, and **Completed**.

## Changes
- Add a persisted `status` field to project steps with the three workflow states, preserving existing completed steps as **Completed** and existing open steps as **To do**.
- Render one board per project, with step cards grouped by status and counts in each column.
- Allow cards to be dragged between columns; dropping updates the database immediately and keeps completion timestamps in sync.
- Keep the existing critical marker, dates, reminder indicator, delete action, and step-creation form.
- Add accessible non-drag controls on each card so the status can also be changed with a keyboard or touch-friendly menu.
- Update reminder logic so completed steps never appear as due, while **To do** and **In progress** steps continue to trigger reminders.

## Technical details
- Use native browser drag-and-drop to avoid adding a dependency.
- Store status as a constrained text value: `todo`, `in_progress`, or `completed`.
- Keep the existing `done` and `done_at` fields synchronized for backward compatibility with the current reminder and checklist behavior.
- Preserve the current open database access policy and grants used by the app.
- Verify drag/drop, status persistence after reload, step creation, and responsive three-column layout in the live preview.
