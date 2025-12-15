# Services HTTP Plumbing Normalization

## Scope

Target services:
- **themeService.js** (major)
- **analytics.js** (minor)
- **shiftLocations.js** (minor)  
- **sectionEditorApi.js** (review minor)
- **salesAnalytics.js** (verify only)
- **stockAnalytics.js** (verify only)
- **memoryGameAPI.js** (verify only)
- **quizGameAPI.js** (verify only)

## Step 1 — themeService.js (MAJOR)

- Replace `fetch()` with `api` (axios) from `api.js`
- Remove manual `Authorization` header injection
- Remove `baseURL` logic from this file

**Definition of done:**
- no `fetch()`
- uses `api` from `api.js`
- returns EXACT same shape as before

## Step 2 — analytics.js + shiftLocations.js (MINOR)

- Use `buildStaffURL()` ONLY if the resulting URL is identical to current behavior
- If not identical, leave code unchanged and note it

**Definition of done:**
- no behavior change
- no URL changes

## Step 3 — sectionEditorApi.js (MINOR REVIEW)

- Check local URL helper; replace only if zero behavior change

## Step 4 — Verify-only files

- Ensure they do not create axios instances or baseURL logic
- Ensure they import `api`/`publicAPI` from `api.js`

## Validation checklist

- `grep src/services` for: `fetch(` → zero
- `grep src/services` for: `axios.create(` → only `api.js`
- `grep src/services` for: `http://localhost` OR `VITE_API_URL` → only `api.js`
- App loads and affected screens work