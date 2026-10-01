# Know Yourself — technical manual (psychometric profile)

Nanoskool has two separate parts:

1. **Genius Habits**: the 8 habits, checked each term by the Genius Quest.
2. **Know Yourself**: the psychometric profile described here.

This manual follows the documentation the *Standards for Educational and Psychological Testing* (AERA/APA/NCME) and the *ITC Guidelines on Test Use* expect: purpose, constructs, sources, scoring, reliability, norms, fairness, and limits of use. It must be updated after each pilot.

## 1. Purpose and intended use

- **Purpose:** a *screening* profile that helps teachers, parents and the school counsellor understand a child's strengths and areas to grow, so they can support the child.
- **Not for:** diagnosis, clinical decisions, admissions, streaming, ranking, marks or report-card grades. It must not be used to label a child. The UI states this on every profile view.
- **Who interprets it:** class teachers and parents (with the guidance shown in the app). Concerns go to the school counsellor via *Suggest a conversation*. Counsellors are teachers switched on under School → Wellbeing; school admins can always see these requests.
- **Status:** the starter items are original Nanoskool items. They are **not yet validated**. Until pilot data exists, every band is labelled provisional.

## 2. What is measured

Four areas, 16 dimensions. The item text and level descriptions are in `server/src/lib/psyBank.ts`.

| Area | Dimensions | Main sources |
|---|---|---|
| Personality | Personal hygiene, Grooming & appearance, Etiquette & manners, Social confidence | teacher observation, parent, child (Grades 4+ for confidence) |
| Physical | Fitness & stamina, Motor coordination, Healthy habits, Sportsmanship & safety | PE fitness tests, teacher, parent, child |
| Spiritual (values, not religion) | Inner calm, Honesty & integrity, Gratitude & kindness, Care for life & nature | child, parent, teacher |
| Observation & analysis | Attention to detail, Pattern spotting, Logical reasoning, Analysing information | child (puzzles with one right answer) |

## 3. Sources and forms

| Source | What | When |
|---|---|---|
| **Child** (Know Yourself) | Self-rating statements (some reverse-keyed), situations with graded options, and puzzles. Grades 1–3 get a 3-point picture scale, read-aloud and fewer areas (30 items). Grades 4–7 and 8–10 have 52 scored items (≥4 per dimension) plus 3 answer-quality checks. | once a term |
| **Parent** | 24 home-behaviour statements (2 per dimension). Parents may skip items they cannot judge. | once a term |
| **Teacher** | Ratings of observed dimensions: 1 Rarely · 2 Sometimes · 3 Usually · 4 Always. Each dimension has a written description of every level. Each teacher's rating is stored separately, so two teachers can rate the same child. | once a term |
| **PE tests** | 50 m sprint, 600 m run/walk, plank, sit-and-reach, standing broad jump, flamingo balance. No BMI or weight. | once a term |

## 4. Scoring

1. **Item scores (0–1):** a scale item is scored (value − 1)/(points − 1), and a reverse-keyed item is scored 1 minus that. Situations use the credit set on each option. Puzzles score 1 if right, 0 if wrong. Answer-quality items are not scored.
2. **Source score (0–100):** the weighted mean of the item scores for the dimension. It is reported only if the child answered at least 3 items (parents: at least 2).
3. **Teacher score:** the mean of the raters' levels, mapped to 1→20, 2→50, 3→72, 4→92 (interpolated).
4. **Fitness score:** the percentile rank among children of the same grade in the same term, and the same gender when there are 10 or more of them. It needs at least 5 children. Sprint and run scores feed *Fitness & stamina*; balance, jump and sit-and-reach feed *Motor coordination*.
5. **Combined score:** a weighted mean of the available sources.

   | Grades | Child | Parent | Teacher | PE |
   |---|---|---|---|---|
   | 1–3 | 0.20 | 0.30 | 0.30 | 0.30 |
   | 4–10 | 0.40 | 0.20 | 0.30 | 0.30 |

   Weights are renormalised over the sources that are present.
6. **Range:** combined ± SEM, where SEM = SD·√(1 − α)/√(number of sources). Until norms exist, SD = 18 and α = 0.70 are assumed.
7. **Bands:**
   - Before norms (provisional): Growing < 40, Developing 40–59, Good 60–79, Strength ≥ 80.
   - With norms (at least 30 children in the grade): by percentile. Growing < 16, Developing 16–49, Good 50–84, Strength ≥ 85.
8. **Attention (staff only):** a dimension scoring below 40 from two or more sources is shown as "worth a gentle conversation". This is not a diagnosis.

## 5. Answer quality (response validity)

Each child's form is checked when it is submitted:

| Flag | Rule |
|---|---|
| too_fast | under 2 s per item (3 s for Grades 1–3), when 8 or more items were answered |
| same_answer | 90% or more of the scale answers are the same value |
| inconsistent | the child strongly agreed with a statement *and* its reverse (items sharing a pair code) in at least a third of the pairs |
| desirability | the child chose the top point on 2 or more "too good to be true" statements |

Flagged profiles show "interpret with care". Flagged answers are left out when norms are built.

## 6. Reliability, item quality and fairness

Assessment studio → Psychometric profile → Quality & norms shows the following for each form family:

- **Cronbach's α** per dimension, from children who answered every item of that dimension. Targets: α ≥ 0.70 is good, 0.60–0.69 is fair, below 0.60 means revise the items. It needs at least 30 children.
- **Item statistics:** the mean (difficulty or endorsement) and the item–rest correlation. An item is flagged if its item–rest correlation is below 0.20, or if its mean is above 0.95 or below 0.05.
- **Fairness (DIF screen):** item-score differences between girls and boys, and between English and translated versions. Children are matched on their rest score (3 bands). Each group needs at least 20 children, and a difference of 0.15 or more is flagged. This is a screen, not a full Mantel–Haenszel or IRT analysis; the external validation should include a full analysis.
- **Teacher agreement:** exact and within-one-level agreement when two teachers rated the same child in the same term. The target is 80% or more within one level.

## 7. Norms

*Rebuild norms* stores, for each grade and dimension, the number of children, mean, SD, α and 21 percentile points (0, 5 … 100). These come from each child's latest unflagged self-report score. Rebuild every term. Percentiles appear only when a grade has at least 30 children. National or state norms need a planned, representative sample (see §10).

## 8. Translation and adaptation (ITC guidelines)

For each item and language, the item bank stores a translation, an independent back-translation and an approval. Children and parents see a language only when **every** item on their form has an approved translation. Machine translation must not be approved without review by a qualified translator. The fairness screen compares translated with English versions.

## 9. Consent, assent, privacy and retention

- A separate parent permission covers Know Yourself (`consent.psychometric`), apart from the Genius Quest and media permissions.
- Without it, staff see nothing and cannot add observations. Parents can still see and erase existing data.
- The child must tick an assent box (read aloud for Grades 1–3) before starting. Children may skip questions or stop at any time.
- Results are visible to the child (a child-friendly view), their parents, their teachers and the counsellor. Counsellor notes are visible only to counsellors and school admins.
- A parent can delete all Know Yourself data about their child. This also turns the permission off.
- Retention: answers, observations and fitness results older than `PSY_RETENTION_MONTHS` (default 36) are deleted when the server starts.
- India's Digital Personal Data Protection Act 2023 requires verifiable parental consent for children's data and restricts behavioural monitoring of children. Have the school's legal adviser confirm that the consent wording and processing meet the Act and its Rules.

## 10. Validation plan (before wider use)

1. Pilot in 2–3 schools for one term, covering every grade (target ≥ 30 children per grade).
2. Review the Quality & norms tab: revise or drop weak items, check DIF, check teacher agreement, and retrain raters where agreement is low.
3. Test–retest: a subsample retakes the form after 2–4 weeks (target r ≥ 0.70).
4. Validity: check that the dimensions correlate as expected across sources (child, parent and teacher) and with related measures such as PE results and attendance. Confirm the structure with a factor analysis once n ≥ 200 per form.
5. Publish norms and update this manual (item changes, α, norms n, limitations).
6. Consider an independent review by a qualified psychometrician or child psychologist.

## 11. Limitations

- The starter items are unvalidated. Self-report by young children and social desirability limit accuracy.
- Teacher ratings can be biased, which the level descriptions and double rating aim to reduce.
- Fitness percentiles are local (school and grade), not national norms.
- The profile describes behaviour in context. It does not measure fixed traits or intelligence, and it must never be used alone for decisions about a child.
