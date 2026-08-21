# ERCS AoP — Final Role-Filtered Prototype

This version keeps the existing aggregation and approval logic, while fixing the Plan navigation and role scoping.

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173/
```

For a production build:

```bash
npm run build
npm run preview
```

## Role behaviour

The role selector uses exact Region/Project identities:

- National Activity AOP
- Regional Coordinator — Amhara
- Regional Coordinator — Oromia
- Regional Coordinator — Somali
- Project Coordinator — Project A
- Project Coordinator — Project B
- Project Coordinator — Project C
- Project Coordinator — Project D

Each coordinator only sees and can edit/submit records belonging to that exact Region/Project. This restriction is enforced in both the UI filtering and AppContext actions.

## Plan navigation

```text
Plan
  National Activity
    Project / Region
```

Selecting a National Activity opens its detail page. Selecting a Project/Region under it focuses the same page on that exact execution entry.

From the detail page:

- Add Plan Entry opens the annual plan wizard with the selected National Activity as the parent.
- Quarterly Plan opens Step 2 filtered to the selected parent and the user's assigned entry.
- Quarterly Actuals opens Step 3 filtered to the selected parent and the user's assigned entry.

## Strategic Priority

Strategic Priority is not displayed anywhere in the user interface. The internal field is retained only so existing data structures and aggregation relationships remain compatible.

## Fresh data

This revision uses a new browser persistence namespace so old localStorage from earlier prototype versions does not override the supplied Excel-backed starter data.
