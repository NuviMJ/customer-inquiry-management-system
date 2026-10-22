# Decisions

## Assumptions

- A small team: a few staff and one or two managers, all in one office. No customer-facing login.
- Three statuses are enough for this business: New, In Progress, Resolved.
- Accounts are created by a manager.

## Design choices

**1. Ownership.**
Staff see inquiries assigned to them plus unassigned ones; managers see everything. New inquiries start unassigned unless the recorder ticks "Assign to me". Only the assignee or a manager can change status or priority. Claiming runs `UPDATE ... WHERE id = $1 AND assigned_to IS NULL`, so if two staff click Claim together only one succeeds and the other gets 409.

**2. Status.**
Allowed moves: New → In Progress, New → Resolved, In Progress → Resolved, Resolved → In Progress (reopen). Anything else returns 409 and an unknown value returns 400. The client has a copy of the table only to decide which buttons to show; the server is the authority. An In Progress inquiry cannot be reassigned, so work is never pulled away from the person doing it.

**3. Stale data is handled with a conditional update, not locking.**
Every status change sends `expectedStatus`, the status the user last saw. The API runs `UPDATE ... WHERE id = $1 AND status = $expected`. Zero rows changed means someone else got there first, so the API returns 409 and the page reloads.

## Trade-off accepted

The ownership rules are strict: once an inquiry is claimed, only that person or a manager can see it or change it, and an In Progress inquiry cannot be reassigned at all. This keeps responsibility clear and the access check simple (one condition on `assigned_to`), but it has a cost. If the customer calls back and reaches a different staff member, that person cannot open the existing inquiry; they only see the duplicate warning with its number and must ask the owner or a manager. If the owner is away, a manager has to resolve or reopen the inquiry before it can be handed over. 

## Testing

- **Backend** (`server/tests`): the status transition table, and an access suite against the seeded database: 401 without a session, 403 for staff on someone else's inquiry, 200 for a manager, 409 when reassigning an In Progress inquiry, and the claim race where only the first of two staff succeeds.
- **Frontend** (`client/src/pages/NewInquiryPage.test.tsx`): an empty form shows four field errors and sends no request; a mocked 409 shows the duplicate message with a link to the existing inquiry.
- **Manual:** every API route was checked in the browser's Network tab while using the app: request bodies, status codes (200, 201, 204, 400, 401, 403, 404, 409) and the error JSON shape.
- **Gaps:** the two-tab stale status case is tested by hand, since it needs two concurrent sessions. The backend access test depends on seed data, so it needs a freshly seeded database.


## What I would improve next

1. A `status_history` table (who changed what, when) instead of only `updated_by` and `updated_at`.
2. Pagination on the inquiry list once it grows past a few hundred rows.
3. Ability to assign two or three staff to one inquiry.

## Where AI helped

I used Claude Code throughout: scaffolding the project, writing the first version of each route and page, the SQL, and the tests. I reviewed and ran everything locally and changed the design in several places.

**Suggestion I changed:** the first version auto-assigned every new inquiry to the staff member who recorded it, so staff could only ever see their own work. I replaced that with an unassigned pool and a Claim action, so anyone can pick up new inquiries and a manager can see at a glance what nobody is handling.

## Decisions made during the build

**Access**
- Staff see inquiries assigned to them or unassigned; managers see everything.
- New inquiries start unassigned. Anyone can claim one, and two people cannot claim the same one.
- Only the assignee or a manager can change an inquiry's status.
- Managers can reassign, except when the inquiry is In Progress. Then it is blocked with a message.
- Managers can add staff members from the Staff page.
- Managers can delete an inquiry via a red bin icon on the detail page.

**Status rules**
- Allowed moves: New to In Progress, New to Resolved, In Progress to Resolved, Resolved to In Progress. Everything else rejected.
- The reopen button on a Resolved inquiry is labelled "Reopen".

**Data rules**
- Priority is optional: High, Medium or Low.
- Duplicate means same contact and subject with an open inquiry. Return 409 with a link to the existing one.

**UI**
- Light neutral theme with the chosen palette, left sidebar, red only for problems.
- Sidebar items: Dashboard, Inquiries, New Inquiry, plus manager-only Managers and Staff pages.
- Show a "saved" message after creating an inquiry.
- Priority shown as a coloured square and label, visually different from status pills.
- Updated column shows relative time such as "3h ago".
- Staff list split into two sections: Unassigned and Assigned to me.
- Unassigned rows get a light highlight so managers spot them.
