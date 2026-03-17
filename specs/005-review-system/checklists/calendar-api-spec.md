# Calendar API Implementation Specification Checklist

**Purpose**: Validates that Calendar/DateComponents API requirements are completely,
clearly, and consistently documented across all specification documents. This is a
**requirements quality gate** - ensuring the research conclusion (Calendar API MUST
be used) is enforceable through specification completeness.

**Created**: 2025-12-30
**Last Validated**: 2026-03-16
**Checklist Type**: Requirements Quality Validation
**Focus**: Calendar API date calculation specifications for Review System
**Actor**: Implementer/Reviewer
**Depth**: Comprehensive (release gate)

---

## 1. Calendar API Core Pattern Documentation

- [x] **CHK001** - Is the complete 5-step Calendar API pattern documented in at least one spec document? [Completeness, Spec §API Reference]
- [x] **CHK002** - Is `Calendar.current.startOfDay(new Date())` explicitly specified as the "today" definition? [Clarity]
- [x] **CHK003** - Is `new DateComponents()` constructor usage documented? [Completeness]
- [x] **CHK004** - Is `Calendar.current.dateByAddingDateComponents(today, dc)` specified as the calculation method? [Completeness]
- [x] **CHK005** - Is the return type (JavaScript Date object) explicitly stated? [Clarity]
- [x] **CHK006** - Is ISO 8601 serialization pattern documented for the output? [Completeness]

---

## 2. Calendar.current Method Specification

- [x] **CHK007** - Is `startOfDay(date)` method documented with its purpose (returns midnight)? [Clarity, Spec §Date Calculation Pattern]
- [x] **CHK008** - Is `dateByAddingDateComponents(date, components)` method documented with input/output? [Clarity]
- [x] **CHK009** - Are both required methods listed in spec.md? [Completeness, Spec §API Reference]
- [x] **CHK010** - Are both methods documented in plan.md for implementation guidance? [Gap]
- [x] **CHK011** - Are both methods shown in quickstart.md code examples? [Gap]

---

## 3. DateComponents Property Specification

- [x] **CHK012** - Is `dc.day` property documented for 'days' unit? [Completeness, Spec §DateComponents Unit Mapping]
- [x] **CHK013** - Is `dc.day = steps * 7` workaround documented for 'weeks' unit? [Completeness]
- [x] **CHK014** - Is `dc.month` property documented for 'months' unit? [Completeness]
- [x] **CHK015** - Is `dc.year` property documented for 'years' unit? [Completeness]
- [x] **CHK016** - Is the DateComponents Unit Mapping table present in spec.md? [Completeness, Spec §DateComponents Unit Mapping]
- [x] **CHK017** - Is the unit-to-property mapping consistent across all documents? [Consistency]

---

## 4. Unit Mapping Specification Completeness

- [x] **CHK018** - Is the switch statement or equivalent mapping mechanism specified? [Clarity]
- [x] **CHK019** - Is `'days' → dc.day = steps` mapping documented? [Completeness]
- [x] **CHK020** - Is `'weeks' → dc.day = steps * 7` mapping documented? [Completeness]
- [x] **CHK021** - Is `'months' → dc.month = steps` mapping documented? [Completeness]
- [x] **CHK022** - Is `'years' → dc.year = steps` mapping documented? [Completeness]
- [x] **CHK023** - Are all 4 reviewInterval.unit values covered (no missing units)? [Coverage]
- [x] **CHK024** - Is the mapping documented in data-model.md? [Gap]

---

## 5. "Today" Definition Requirements

- [x] **CHK025** - Is "today" defined as `Calendar.current.startOfDay(new Date())`? [Clarity, Spec §Date Calculation Pattern]
- [x] **CHK026** - Is midnight normalization (00:00:00 local time) explicitly stated? [Clarity]
- [x] **CHK027** - Is consistency requirement documented (same "today" value within execution)? [Completeness, Gap]
- [x] **CHK028** - Is time-of-day ambiguity explicitly addressed? [Clarity]
- [x] **CHK029** - Is the "today" definition documented in data-model.md? [Gap]
- [x] **CHK030** - Is the "today" definition shown in quickstart.md examples? [Gap]

---

## 6. Calendar Arithmetic Edge Case Documentation

- [x] **CHK031** - Is month-end boundary handling documented (Jan 31 + 1 month → Feb 28/29)? [Coverage, Edge Case]
- [x] **CHK032** - Is leap year handling documented (Feb 29 + 1 year → Feb 28 in non-leap)? [Coverage, Edge Case]
- [x] **CHK033** - Is year boundary handling documented (Dec 15 + 1 month → Jan 15)? [Coverage, Edge Case]
- [x] **CHK034** - Is it explicit that Calendar API handles these automatically (not manual logic)? [Clarity]
- [x] **CHK035** - Is the "Why Calendar API > Millisecond Math" comparison documented? [Completeness, Spec §research.md]
- [x] **CHK036** - Are DST transition edge cases addressed? [Coverage, Edge Case]
- [x] **CHK037** - Are edge cases documented in spec.md or data-model.md for implementer reference? [Gap]

---

## 7. Code Example Completeness

- [x] **CHK038** - Does research.md contain complete `calculateNextReviewDate()` function? [Completeness]
- [x] **CHK039** - Does quickstart.md show `mark_reviewed` using Calendar API? [Gap]
- [x] **CHK040** - Does quickstart.md show `set_review_interval` with recalculate using Calendar API? [Gap]
- [x] **CHK041** - Do all code examples show complete pattern (startOfDay → DateComponents → dateByAdding)? [Completeness]
- [x] **CHK042** - Are there NO partial examples that could mislead implementers? [Clarity]
- [x] **CHK043** - Is example code consistent across spec.md, research.md, and quickstart.md? [Consistency]

---

## 8. Implementation Algorithm Step Specification

- [x] **CHK044** - Is Step 1 documented: `var today = Calendar.current.startOfDay(new Date())`? [Completeness]
- [x] **CHK045** - Is Step 2 documented: `var dc = new DateComponents()`? [Completeness]
- [x] **CHK046** - Is Step 3 documented: unit mapping switch statement? [Completeness]
- [x] **CHK047** - Is Step 4 documented: `Calendar.current.dateByAddingDateComponents(today, dc)`? [Completeness]
- [x] **CHK048** - Is Step 5 documented: `project.nextReviewDate = nextDate`? [Completeness]
- [x] **CHK049** - Are all 5 steps documented in quickstart.md or data-model.md? [Gap]
- [x] **CHK050** - Is the step order explicitly numbered/sequenced? [Clarity]

---

## 9. Error Handling Specification

- [x] **CHK051** - Is behavior for invalid DateComponents (e.g., dc.day = -5) documented? [Gap, Exception Flow]
- [x] **CHK052** - Is behavior for date overflow (year beyond JavaScript Date range) documented? [Gap, Exception Flow]
- [x] **CHK053** - Is null reviewInterval handling documented (error before reaching Calendar API)? [Coverage, Spec §FR-014]
- [x] **CHK054** - Are Calendar API exceptions documented as surfacing structured errors? [Gap, Exception Flow]
- [x] **CHK055** - Is error handling consistent between mark_reviewed and set_review_interval? [Consistency]

---

## 10. Testing Example Specification

- [x] **CHK056** - Are concrete test cases for 'days' unit with actual dates specified? [Measurability, Gap]
- [x] **CHK057** - Are concrete test cases for 'weeks' unit with actual dates specified? [Measurability, Gap]
- [x] **CHK058** - Are concrete test cases for 'months' unit with actual dates specified? [Measurability, Gap]
- [x] **CHK059** - Are concrete test cases for 'years' unit with actual dates specified? [Measurability, Gap]
- [x] **CHK060** - Is example documented: 2025-12-30 + {steps: 7, unit: 'days'} = 2026-01-06? [Measurability, Gap]
- [x] **CHK061** - Is example documented: 2025-01-31 + {steps: 1, unit: 'months'} = 2025-02-28? [Measurability, Gap]
- [x] **CHK062** - Is example documented: 2024-02-29 + {steps: 1, unit: 'years'} = 2025-02-28? [Measurability, Gap]
- [x] **CHK063** - Are edge case test examples in spec or data-model.md for validation? [Gap]

---

## 11. Serialization Pattern Specification

- [x] **CHK064** - Is Calendar API return type (JavaScript Date object) documented? [Completeness]
- [x] **CHK065** - Is ISO 8601 serialization method `.toISOString()` specified? [Clarity]
- [x] **CHK066** - Is serialization format consistent across all tools? [Consistency]
- [x] **CHK067** - Is timezone behavior (local time) documented? [Clarity]
- [x] **CHK068** - Is serialization pattern documented in data-model.md? [Gap]

---

## 12. OmniJS API Version Requirements

- [x] **CHK069** - Is OmniFocus 3.0+ requirement documented for Calendar/DateComponents API? [Completeness, Spec §Important Constraints]
- [x] **CHK070** - Is version requirement in research.md? [Completeness]
- [x] **CHK071** - Is it stated that no version check is needed (3.0 is minimum)? [Clarity]
- [x] **CHK072** - Is version requirement consistent across spec.md, research.md, requirements.md? [Consistency]

---

## 13. Cross-Tool Consistency

- [x] **CHK073** - Is `mark_reviewed` documented as using Calendar API for nextReviewDate calculation? [Completeness, Spec §FR-013]
- [x] **CHK074** - Is `set_review_interval` with `recalculateNextReview: true` documented as using Calendar API? [Completeness, Spec §FR-026]
- [x] **CHK075** - Is it explicit that both tools use identical Calendar API pattern? [Consistency]
- [x] **CHK076** - Is it stated that NO tool uses millisecond arithmetic? [Coverage]
- [x] **CHK077** - Are contracts/*.ts files specified to include Calendar API TSDoc comments? [Gap]

---

## 14. Prohibited Pattern Documentation (Anti-Examples)

- [x] **CHK078** - Does requirements.md explicitly show WRONG: millisecond arithmetic example? [Completeness]
- [x] **CHK079** - Does requirements.md explain WHY millisecond approach fails? [Clarity]
- [x] **CHK080** - Is `Date.now() + (steps * unit_ms)` pattern explicitly prohibited? [Coverage]
- [x] **CHK081** - Are manual month/year calculations explicitly prohibited? [Coverage]
- [x] **CHK082** - Are clear warnings against DIY date arithmetic present? [Completeness]
- [x] **CHK083** - Is the "DO NOT use millisecond arithmetic" section in spec.md? [Completeness, Spec §Date Calculation Pattern]
- [x] **CHK084** - Are prohibited patterns consistent between spec.md and requirements.md? [Consistency]

---

## 15. Document Propagation Traceability

- [x] **CHK085** - Is Calendar API requirement documented in spec.md? [Traceability]
- [x] **CHK086** - Is Calendar API requirement documented in requirements.md? [Traceability]
- [x] **CHK087** - Is Calendar API requirement documented in research.md? [Traceability]
- [x] **CHK088** - Will Calendar API requirement be documented in data-model.md? [Gap, Pending]
- [x] **CHK089** - Will Calendar API requirement be documented in plan.md? [Gap, Pending]
- [x] **CHK090** - Will Calendar API requirement be documented in quickstart.md? [Gap, Pending]
- [x] **CHK091** - Will Calendar API requirement be documented in contracts/*.ts TSDoc? [Gap, Pending]
- [x] **CHK092** - Is there a single source of truth for Calendar API pattern? [Traceability]

---

## Summary Statistics

**Validation Status: ALL 92 ITEMS RESOLVED**

| Category | Items | Doc Coverage |
|----------|-------|-------------|
| Core Pattern | 6 | spec.md, research.md, data-model.md, quickstart.md |
| Method Spec | 5 | spec.md, plan.md, quickstart.md |
| Property Spec | 6 | spec.md, data-model.md |
| Unit Mapping | 7 | spec.md, requirements.md, data-model.md |
| Today Definition | 6 | spec.md, data-model.md, quickstart.md |
| Edge Cases | 7 | research.md, spec.md, data-model.md |
| Code Examples | 6 | research.md, spec.md, quickstart.md |
| Algorithm Steps | 7 | research.md, quickstart.md, data-model.md |
| Error Handling | 5 | spec.md, data-model.md |
| Testing Examples | 8 | spec.md, data-model.md |
| Serialization | 5 | spec.md, data-model.md |
| Version Reqs | 4 | spec.md, research.md |
| Cross-Tool | 5 | spec.md, contracts |
| Prohibited Patterns | 7 | spec.md, requirements.md |
| Doc Propagation | 8 | All 7 documents now exist |

**Total Items**: 92
**All Documents Now Exist**: spec.md, research.md, requirements.md, data-model.md, plan.md, quickstart.md, contracts/*.ts

---

## Validation Notes

This checklist validates REQUIREMENTS QUALITY, not implementation behavior:

- Each item asks whether a requirement is DOCUMENTED, not whether code WORKS
- [Gap] markers identify missing requirements in pending documents
- [Consistency] markers identify cross-document alignment requirements
- [Clarity] markers identify ambiguous or vague specifications
- [Completeness] markers identify partial or missing specifications
- [Measurability] markers identify requirements that need concrete test values

**Pass Criteria**: All 92 items (CHK001-CHK092) are satisfied.
All previously pending documents (data-model.md, plan.md, quickstart.md, contracts/*.ts) now exist with Calendar API content.
