# Exercise Engine Logic & Platform Algorithm

## 1. Template Rendering & Slot Injection
* **Parsing:** The frontend engine reads the active tense partition file and parses the `text_template` string.
* **Dynamic Projection:** Placeholder tags are dynamically replaced with interactive input fields (or selection elements) mapped directly to their corresponding index in the `targets` array using `slot_id` and `token_index`.

## 2. Answer Validation & Multi-Target Handling
* **String Normalization:** Student inputs are sanitized by removing leading/trailing whitespace and matching casing rules before evaluation.
* **Multi-Variant Matching:** User input is evaluated against the complete array of strings stored in `accepted_answers`. If any string in the array matches, the response is marked correct.
* **Independent Slot Evaluation:** Sentences containing multiple target slots evaluate each slot independently against its individual constraints, allowing partial or multi-part validation within a single exercise item.

## 3. Auxiliary, Agreement & Reflexive Logic
* **Auxiliary Enforcement:** The engine cross-references target verbs with `verbs.json` to enforce correct auxiliary selection (*essere* vs. *avere*).
* **Agreement Flexibility:** For *essere*-based verbs (movement, state changes, reflexives), accepted answers account for gender and number agreement variations where applicable based on the subject pronoun or context.

## 4. Tier-Based Weighting & Adaptive Difficulty
* **Difficulty Filtering:** The session runner filters sentence generation by `difficulty_level` to match user proficiency tiers.
* **Frequency Prioritization:** By linking sentence targets to the `verbs.json` database, the algorithm weights selection toward Tier 1 essentials for early modules while seamlessly blending Tier 3 long-tail verbs into advanced sessions.

## 5. Pedagogical Feedback Loop
* **Contextual Explanations:** Upon submission, the platform extracts and displays the specific rule-based `explanation` tied to the evaluated target, reinforcing grammatical comprehension immediately following validation.