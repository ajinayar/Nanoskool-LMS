/**
 * One-off, idempotent upgrade: the skills mission used to be set per age group
 * (little = Grades 1–3, junior = 4–7, senior = 8–10). It is now set per grade.
 *  - items: `bands` → `grades`
 *  - missions: a band mission becomes the mission for each grade in that band (copied)
 */
import { AssessmentForm, AssessmentItem } from '../models/index.js';
import { logger } from './logger.js';

export const BAND_TO_GRADES: Record<string, number[]> = { little: [1, 2, 3], junior: [4, 5, 6, 7], senior: [8, 9, 10] };

export async function migrateGrades() {
  let items = 0;
  let forms = 0;
  const oldItems = await AssessmentItem.find({ bands: { $exists: true, $ne: [] }, $or: [{ grades: { $exists: false } }, { grades: { $size: 0 } }] }).lean();
  for (const it of oldItems) {
    const grades = [...new Set((it.bands ?? []).flatMap((b) => BAND_TO_GRADES[b] ?? []))].sort((a, b) => a - b);
    await AssessmentItem.updateOne({ _id: it._id }, { grades });
    items++;
  }
  const oldForms = await AssessmentForm.find({ band: { $exists: true, $ne: null }, grade: { $exists: false } }).lean();
  for (const f of oldForms) {
    const [first, ...rest] = BAND_TO_GRADES[f.band as string] ?? [];
    if (!first) continue;
    await AssessmentForm.updateOne({ _id: f._id }, { grade: first, title: f.title.includes('Grade') ? f.title : `${f.title} · Grade ${first}` });
    for (const g of rest) {
      const { _id, createdAt: _c, updatedAt: _u, ...copy } = f as typeof f & { createdAt?: Date; updatedAt?: Date };
      await AssessmentForm.create({ ...copy, grade: g, title: f.title.includes('Grade') ? f.title : `${f.title} · Grade ${g}`, version: 1 });
    }
    forms++;
  }
  if (items || forms) logger.info({ items, forms }, 'skills mission moved from age groups to single grades');
}
