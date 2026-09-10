# APPLICATION INVENTORY

Structured inventory of the reference application. Filled from `DISCOVERY-LOG.md`.

## Legend
- **Status:** `observed` = verified in reference app · `assumed` = inferred (see `ASSUMPTIONS.md`)

---

## 1. Modules

> One row per module. Repeat the detail block per module.

| ID | Module | Purpose | Route | Parent menu | Submenu | Permissions | Related entities | Status |
|----|--------|---------|-------|-------------|---------|-------------|------------------|--------|
| _–_ | _TBD_ | | | | | | | |

### Module detail template

```
Module: <name>
  Purpose:
  Route(s):
  Parent menu / submenu:
  Required permissions:
  Related entities:
  Available actions:

  Pages:
    - Page: <title>
      Route:
      Layout:
      Components:
      Data displayed:
      Actions (row / bulk / page-level):
      Filters:
      Search:
      Pagination / page size:
      Sorting:
      Forms / modals:
      Related pages:

  Actions:
    - Action: <button/action name>
      What it does:
      Required fields:
      Validation:
      API operation (method + path, observed or assumed):
      Result / success behavior:
      Error behavior:
      Permission required:
```

---

## 2. Navigation tree

```
Application
└── (fill after login)
```

Menu model fields to capture per node: `id, parentId, title, slug, route, icon, order,
visibility, permission, active, children, external/internal, moduleId`.

---

## 3. Dashboard

| Widget | Type (card/KPI/chart) | Data shown | How it's calculated | Date filter? | Status |
|--------|-----------------------|------------|---------------------|--------------|--------|
| _TBD_ | | | | | |

---

## 4. Reports / print / export

| Report | Route | Filters / date range | Output formats | Underlying data | Status |
|--------|-------|----------------------|----------------|-----------------|--------|
| _TBD_ | | | | | |

---

## 5. Roles & permissions (as visible to inspection account)

| Role | Modules / actions allowed | Notes | Status |
|------|---------------------------|-------|--------|
| _TBD_ | | | |

---

## 6. Reference-vs-clone checklist

| Area | Reference | Clone |
|------|-----------|-------|
| Login | ✓ | ☐ |
| Dashboard | ✓ | ☐ |
| Menu | ✓ | ☐ |
| Submenus | ✓ | ☐ |
| Routing | ✓ | ☐ |
| Forms | ✓ | ☐ |
| Validation | ✓ | ☐ |
| CRUD | ✓ | ☐ |
| Search | ✓ | ☐ |
| Filters | ✓ | ☐ |
| Reports | ✓ | ☐ |
| Printing / export | ✓ | ☐ |
| Permissions | ✓ | ☐ |
| Responsive UI | ✓ | ☐ |
