# Candidate corpus: first review

## Status and scope

**Historical findings, resolved in the replacement corpus.** See [implementation results](content-release.md).
The source snapshot remains unchanged for provenance. This is a first editorial pass across the 200 supplied unique
sentences and 47 verb metadata records, plus a structural audit. It is not native-speaker
certification or a completed, independently checked conjugation database. Linguistic changes
below are proposals, not edits already applied to the JSON. Only a JSON quoting repair and
exact-duplicate removal have been applied during organization.

The source notes describe a 2,000-sentence roadmap; the downloads supply 200. The twenty
distinct batches each have ten sentences. One additional download repeats ten passato
prossimo records exactly. No missing sentences have been generated or inferred.

| Partition                    | Sentences | Referenced verbs |
| ---------------------------- | --------: | ---------------: |
| Present indicative           |        60 |               30 |
| Passato prossimo             |        60 |               30 |
| Imperfetto                   |        40 |               25 |
| Futuro semplice (as labeled) |        40 |               22 |
| Total                        |       200 |      60 distinct |

All records have one slot. Difficulty is 1 for 40 records, 2 for 150, and 3 for 10.
Person counts: io 38, tu 40, lui/lei 37, noi 34, voi 17, loro 34. These are observed
counts, not evidence of calibrated everyday usage or learning progression.

## Structural and database blockers

- `gemini-code-1793588225567.json` had an unquoted `approverà` in `sent-fut-136`.
  The organized copy is valid JSON; the original bytes are backed up locally.
- `gemini-code-1793587890724.json` repeats `1793587850532` exactly at the record level
  (`sent-past-131`–`140`). Only one copy was retained in the merged partition.
- Fourteen referenced infinitives are absent from `verbs.json`: **aprire, ascoltare, bere,
  curare, finire, guardare, passare, potere, preparare, promettere, pulire, puntare,
  rispondere, suonare**. `puntere` is an unused typo for `puntare`.
- There are no complete six-person paradigms, including for irregular present forms.
  Stems and sparse participles cannot supply the existing feedback table safely.
  Missing irregular participles include `fatto`, `detto`, `venuto`, and `visto`/`veduto`.
- `radice_imperfetto` uses incompatible conventions: `av-` for avere versus `andav-`
  for andare. A single suffix rule cannot consume both. Define one rule or store full forms.
- `irregolare` has unclear scope: prendere is false despite its irregular `preso`;
  perdersi lacks `perso` and godersi lacks its contracted future stem. Use tense-specific
  regularity rather than inferring all forms from this flag. Godere admits both `godrò`
  and less common `goderò`; review the corresponding pronominal alternatives too.
  See [Treccani: godere](https://www.treccani.it/vocabolario/godere/).
- `coniugazione` mixes verb class, auxiliary function, and pronominal behavior. Those
  should be separate properties; labels for contracted verbs must not drive a naive generator.
- A modal's default `avere` is not a universal runtime rule. Auxiliary selection can depend
  on the following verb and pronoun placement. Keep approved answers authoritative.
  See [Treccani: verbi servili](https://www.treccani.it/enciclopedia/verbi-servili_%28La-grammatica-italiana%29/).
- `token_index` has no documented tokenizer or index base. It disagrees with whitespace
  positions in 149 records at base 0 and 75 at base 1. Use `{slot_0}` as the source of
  placement; remove or derive word positions rather than maintaining both by hand.
- Normalize `lui_lei` to the app's `lui/lei` and choose one tense-ID convention. The source
  mixes `indicativo_presente`, `indicativo_passato_prossimo`, `imperfetto`, and `futuro_semplice`.

`node scripts/audit-new-content.mjs` reproduces the structural inventory and missing-reference
findings. Its exit code is currently 1. It does not verify Italian conjugations or semantics.

## Answer, grammar, and target corrections

These findings block affected records until corrected and rechecked in their full context.

| Record        | Finding                                                                                                                                          | Proposed resolution                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| sent-pres-111 | Formal `Scusi, signore` conflicts with `tu` / `dici`.                                                                                            | Use `Scusa, mi …` for tu, or formal Lei with `dice` and matching metadata.                                                           |
| sent-pres-112 | Accepts `devono` with explicit `io`.                                                                                                             | Retain only `devo`.                                                                                                                  |
| sent-past-104 | `i bambini` also accepts feminine `si sono alzate`.                                                                                              | Accept `si sono alzati` for this subject; revise explanation accordingly.                                                            |
| sent-past-105 | `hai risposto tutte le email` lacks the preposition.                                                                                             | Change the suffix to `a tutte le email importanti`.                                                                                  |
| sent-past-117 | `State estate` is a typo; explanation says `al plural voi`.                                                                                      | Use `Quest'estate` and `alla seconda persona plurale (voi)`.                                                                         |
| sent-past-159 | `i nostri ospiti` accepts feminine `sono tornate` despite masculine agreement in the noun phrase.                                                | Retain `sono tornati`, or use an explicitly feminine subject and corresponding answer.                                               |
| sent-fut-121  | Produces `dove saranno essere?`; `lui_lei` conflicts with plural keys and `saranno`.                                                             | Use `… dove {slot_0}?`, person loro, answer `saranno`; review other plausible tenses under the chosen task policy.                   |
| sent-fut-125  | Blank is only `sarà`, but the hinted verb is perdersi. `si sarà persa` is futuro anteriore, not passato prossimo or futuro semplice of perdersi. | Quarantine from the four-tense pool, or explicitly redesign as an auxiliary-only essere task. Do not silently teach the wrong tense. |
| sent-fut-127  | `Quanti dipendenti saranno in questa … azienda?` does not clearly express the intended employee-count estimate.                                  | Prefer `Quanti dipendenti ci {slot_0} in questa azienda?` if testing essere alone, with `saranno`.                                   |
| sent-fut-128  | `ci sarà` and `sarà` express different constructions/readings, while the explanation only teaches existence.                                     | Put `ci` outside the blank and accept `sarà` for a controlled existential task; review the resulting sentence.                       |
| sent-fut-135  | Target is godersi, but accepts bare `godrai`, dropping the pronominal component.                                                                 | Require the approved pronominal form (`ti godrai`), and review whether `ti goderai` should also be accepted.                         |

The tense diagnosis for `sent-fut-125` follows the auxiliary-future + participle definition of
[futuro anteriore](https://www.treccani.it/enciclopedia/futuro-anteriore_%28Enciclopedia-dell%27Italiano%29/).

## Explanations to rewrite

| Records                                                   | Problem and direction                                                                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sent-pres-124, 128                                        | Uscire does not insert/remove an `-isc-` extension like capire. Explain `esc-` / `usc-` alternation; `usciamo` visibly retains sc. See [Treccani: uscire](https://www.treccani.it/vocabolario/uscire/). |
| sent-pres-139                                             | `-liamo / -iamo` incorrectly presents the stem's l as part of an ending. Use `-iamo`.                                                                                                                   |
| sent-pres-140                                             | Plural -are ending is `-ano`, not `-no` added to the root.                                                                                                                                              |
| sent-pres-144                                             | “Without the internal i” is misleading for `viaggiamo`. Explain that the i is not doubled.                                                                                                              |
| sent-pres-108, 142, 146                                   | Distinguish the `-isc-` extension from the person endings; `-isci-` is not the infix.                                                                                                                   |
| sent-pres-157                                             | The explanation about removing a final e does not explain spegnere. Describe the actual `spegn-` stem for `spegni`.                                                                                     |
| sent-pres-106, 134, 138, 141, 145, 156, 159; sent-imp-111 | Several globally irregular verbs are called regular without limiting the claim to this tense/form. Say the specific ending/form is regular where appropriate.                                           |
| sent-past-101                                             | Replace “participio passato regolare o irregolare (preso)” with the specific fact: preso is irregular.                                                                                                  |
| sent-past-102, 154                                        | Movement alone does not determine auxiliary choice; parlare/viaggiare examples already show why a semantic shortcut is unsafe. Explain the auxiliary of the specific verb.                              |
| sent-imp-132, 133                                         | Existential constructions have a singular/plural subject; avoid describing them simply as impersonal. Align the table with the clitic-containing answer or move the clitic outside the blank.           |
| sent-imp-140                                              | Correct `un abitudine` to `un'abitudine`.                                                                                                                                                               |
| sent-fut-132                                              | The wording suggests a present-tense if-clause requires a future consequence. Explain the chosen future form without claiming it is obligatory.                                                         |

## Naturalness and task clarity

These are editorial judgments, separate from the hard answer errors above.

| Records                      | Suggested improvement                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| sent-pres-131                | `parlo sempre con attenzione` in team meetings sounds generated. Preserve parlare with `Durante le riunioni, io … dei progetti in corso.` |
| sent-pres-153; sent-past-147 | Prefer `quale … leggere/vedere` without di for the intended everyday preference question.                                                 |
| sent-pres-160                | `curi sempre con grande cura` is repetitive; use `curi sempre ogni dettaglio`.                                                            |
| sent-past-111                | `per andare a teatro … sono andato con i miei amici` is repetitive and underspecified. Use `Ieri sera io … a teatro con i miei amici.`    |
| sent-past-124, 128           | Sapere in the passato prossimo means finding out. Make that discovery explicit rather than implying a continuing state of knowing.        |
| sent-imp-103                 | `Da bambina, mia nonna … una persona molto dolce` can be clearer as a childhood description: `Da bambina, mia nonna … molto timida.`      |
| sent-imp-117                 | Prefer `uscivamo spesso a mangiare una pizza` to `uscivamo spesso in pizzeria`.                                                           |
| sent-imp-120                 | `viaggiavano … per viaggiare` is tautological; use `In passato i miei nonni … sempre in treno.`                                           |
| sent-imp-125                 | For tidying a room, riordinare is clearer than ordinare; alternatively keep ordinare and change the object to books/documents.            |
| sent-fut-104                 | Prefer `festa a sorpresa` to `festa sorpresa`; there is also no context fixing person io. Add a natural subject cue.                      |
| sent-fut-107                 | `saranno puntuali davanti al portone` is awkward. Keep essere with `Tra poco i nostri ospiti … qui.`                                      |
| sent-fut-137                 | Setting the alarm tomorrow morning for six is an odd routine. Prefer `Stasera … la sveglia per le sei di domani.`                         |

Pronouns are explicit in many sentences. This resolves person ambiguity, but reduces the
context-inference challenge. Vary pronouns, named subjects, and contextual cues during revision;
do not simply delete pronouns and leave a hidden intended person.

## Cross-tense ambiguity is a product decision

`Domani … parlerò` can often also be `Domani … parlo`. Likewise, `Ogni estate … andavamo`
does not establish a past frame on its own. Many anchors indicate a plausible reading without
making it the only grammatical answer. This is consistent with Italian present-for-future usage
described by [Treccani](https://www.treccani.it/enciclopedia/presente_%28Enciclopedia-dell%27Italiano%29/).

The agreed initial multi-tense implementation uses a subtle visible tense cue and five pilot
questions allowing two named tenses each. Keep reviewed same-task variants (gender where context
permits, visto/veduto, etc.). Each accepted answer needs its own tense/person analysis so mastery
is credited to the skill actually demonstrated. A string array alone cannot do that accurately.
Fully open context-only exercises remain a later possibility. The revised corpus goal is 1,000;
the original 2,000 target above describes the imported source notes.

## Completion gate

Before promotion: obtain/confirm the intended exports; resolve every affected record above;
complete and independently check all referenced verb paradigms; settle ambiguity and clitic
policy; rerun structural checks; then perform a second full linguistic pass on the edited
sentences and explanations. Record approval by stable ID, with unresolved items quarantined
explicitly. Unlisted records in this first pass are not automatically approved.
