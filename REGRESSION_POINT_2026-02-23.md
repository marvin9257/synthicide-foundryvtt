# Synthicide FoundryVTT System

## Regression Point - February 23, 2026

This commit marks a known working state after major refactor of bioclass/trait deletion and persistence logic.

- Bioclass trait deletion now uses deleteEmbeddedDocuments and is filtered for existence.
- Trait creation uses createEmbeddedDocuments.
- updateSource is only used in _preCreate/_preUpdate.
- Known warnings about actor not ready in item-bioclass._onCreate, but system is functionally correct.

Use this point to revert if future changes break bioclass/trait logic.

---

**Manual regression note:**
- If you need to revert, restore all files to this state.
- Key files: module/documents/item.mjs, module/data/item-bioclass.mjs, module/sheets/actor-sheet.mjs

---

(You may wish to commit this state in git for easier rollback.)
