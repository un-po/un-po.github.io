# Data Schema & Field Reference

## 1. Master Sentence Corpus (`sentences/*.json`)

### Sentence Object Fields
* **`id`**: Unique alphanumeric identifier for the master sentence record.
* **`context_theme`**: Categorical tag defining the situational domain or theme.
* **`text_template`**: Base string containing placeholder tags for dynamic token injection.
* **`constraint_type`**: Classification of grammatical triggers, lexical cues, or temporal anchors present in the sentence.
* **`difficulty_level`**: Numerical integer representing cognitive and linguistic complexity.
* **`targets`**: Array of target objects mapping placeholders to specific slot metadata.

### Target Object Fields
* **`slot_id`**: Numerical index aligning with the placeholder tag in the template.
* **`token_index`**: Positional word index of the slot within the rendered text.
* **`verb`**: Base infinitive form of the verb being tested.
* **`mood`**: Grammatical mood required by the target context.
* **`tense`**: Specific conjugated tense identifier.
* **`person`**: Grammatical person or subject pronoun category.
* **`accepted_answers`**: Array of valid string variants permitted for correct validation.
* **`explanation`**: Pedagogical note detailing the underlying grammatical rule or auxiliary choice.

---

## 2. Centralized Verb Database (`verbs.json`)

* **`infinito`**: Base infinitive form of the verb.
* **`coniugazione`**: Conjugation classification category, auxiliary designation, or reflexive marker.
* **`tier`**: Frequency weighting classification level determining corpus prioritization.
* **`ausiliare`**: Default auxiliary verb assignment rule.
* **`irregolare`**: Boolean flag indicating whether the verb follows irregular conjugation patterns.
* **`radice_futuro`**: Custom stem root utilized for future tense projections, if applicable.
* **`radice_imperfetto`**: Custom stem root utilized for imperfect tense projections, if applicable.
* **`participio_passato`**: Irregular past participle form, if applicable.
* **`isc`**: Boolean flag indicating verbs featuring infix extensions across present paradigms.