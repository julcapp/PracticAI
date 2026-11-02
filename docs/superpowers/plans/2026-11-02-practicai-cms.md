# PracticAI CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development; root coordinates backend and one isolated editor task.

**Goal:** manage the existing site and create new pages without changing code.
**Architecture:** MySQL draft/published documents and immutable revisions, server rendering from annotated existing templates, typed content editor. Canonical course data shared with catalog and consultant. Existing CRM retained.
**Tech Stack:** Node25 Express MySQL JSDOM vanilla JS.
**Spec:** docs/superpowers/specs/2026-11-02-practicai-cms-design.md
**Interfaces:** cms/CONTRACT.md (exact HTTP and payload contract).

## Global Constraints
- Russian UI; no arbitrary HTML/JS input; preserve current site/contacts/scenarios.
- Course: 19990 RUB, five lessons, access three months, first Monday monthly,17:30 Asia/Tomsk,100% payment.
- Images PNG/JPEG/WebP3MB; PDFs10MB; draft is private; publication explicit; restore into draft only.
- Backup public legacy content before import; code deployments never overwrite database content.

## Review Focus
- Stale edit/publish rejected with409; failed requests retain unsaved input.
- Hidden/changed fields and pages must not leak private drafts in public API/HTML.
- Persisted schema rejects executable URL/HTML injection and unsafe media filenames.
- Original forms/scripts stay functional; preview strips scripts and cannot submit forms.
- Repeated initialization and restart preserve edited data and history; published course drives all relevant surfaces.

### Task1: CMS backend and templates (root)
- [ ] Tests RED: validation, safe URL, section ordering, drafts/publish/restore, contact preservation.
- [ ] Implement cms/model.js,cms/store.js,cms/render.js,cms/routes.js,cms/template.js with typed JSON payloads.
- [ ] Generate annotated builtin templates/manifest from three pages; import legacy content idempotently with backup.
- [ ] Mount page routes before static, keep existing CRM endpoints, add /admin/cms.
- [ ] Add PDF upload/listing, preserve immutable media and valid image support.
- [ ] Verify API auth/conflicts, history and canonical course replies.

### Task2: CMS editor (one implementer)
- [ ] Read cms/CONTRACT.md; implement views/cms.html,public/cms-admin.js,public/cms-admin.css,public/cms-public.css.
- [ ] Page list/create; edit each section/field,visibility/order,create typed blocks; menu/contacts/course/experts forms.
- [ ] Save draft,preview unsaved page,publish,history restore,media upload/picker; failures keep values and disable duplicate submits.
- [ ] DOM integration tests verify main workflows, dangerous text inert, errors preserved.
- [ ] Self review report; independent review follows before integration.

### Task3: integration and delivery (root)
- [ ] Run all tests and separate code review, fix substantive findings.
- [ ] Workflow verifies CMS endpoints, public pages and media before/after publish; keep backup material private.
- [ ] Update docs, commit real source tree to CMS branch then main using expected-head leases.
- [ ] Confirm deployed CMS+MySQL, visual page editing/publish/restore using temporary nonpublic draft when authenticated automation available.
- [ ] Sync Home-Boss when reachable; report actual verified state.
