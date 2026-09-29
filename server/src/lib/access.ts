/**
 * Tenant and relationship checks. Every route that touches school data goes
 * through one of these helpers, so a user can only reach records that belong
 * to their partner, school, class or children.
 */
import { Types } from 'mongoose';
import type { AuthUser } from '../middleware/auth.js';
import { ClassCourse, ClassSection, CourseGrant, School, User } from '../models/index.js';
import { forbidden, notFound } from './errors.js';

const eq = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

export async function partnerSchoolIds(partnerId: string) {
  const schools = await School.find({ partnerId }).select('_id').lean();
  return schools.map((s) => s._id);
}

/** Mongo filter limiting a query on a collection with a `schoolId` field to what the user may see. */
export async function schoolFilter(user: AuthUser): Promise<Record<string, unknown>> {
  if (user.role === 'super_admin') return {};
  if (user.role === 'partner') return { schoolId: { $in: await partnerSchoolIds(user.partnerId!) } };
  return { schoolId: user.schoolId ? new Types.ObjectId(user.schoolId) : null };
}

export async function assertSchoolAccess(user: AuthUser, schoolId: unknown) {
  if (user.role === 'super_admin') return;
  if (user.role === 'partner') {
    const school = await School.findById(schoolId).select('partnerId').lean();
    if (!school) throw notFound('School');
    if (!eq(school.partnerId, user.partnerId)) throw forbidden();
    return;
  }
  if (!eq(user.schoolId, schoolId)) throw forbidden();
}

/** Classes a teacher teaches: as class teacher or through an assigned course. */
export async function teacherClassIds(teacherId: string): Promise<string[]> {
  const [own, taught] = await Promise.all([
    ClassSection.find({ classTeacherId: teacherId }).select('_id').lean(),
    ClassCourse.find({ teacherId }).select('classId').lean(),
  ]);
  return [...new Set([...own.map((c) => String(c._id)), ...taught.map((c) => String(c.classId))])];
}

/**
 * mode "read": may view the class (members, schedule).
 * mode "teach": may take attendance, post assignments, grade.
 */
export async function assertClassAccess(user: AuthUser, classId: string, mode: 'read' | 'teach' = 'read') {
  const cls = await ClassSection.findById(classId).lean();
  if (!cls) throw notFound('Class');
  if (user.role === 'super_admin') return cls;
  if (user.role === 'partner' || user.role === 'school_admin') {
    await assertSchoolAccess(user, cls.schoolId);
    return cls;
  }
  if (user.role === 'teacher') {
    if (!eq(cls.schoolId, user.schoolId)) throw forbidden();
    // Teachers see and manage only the classes they teach
    const ids = await teacherClassIds(user.id);
    if (!ids.includes(String(cls._id))) throw forbidden('You do not teach this class');
    return cls;
  }
  if (mode === 'teach') throw forbidden();
  if (user.role === 'student' && eq(user.classId, cls._id)) return cls;
  if (user.role === 'parent') {
    const kids = await User.find({ _id: { $in: user.childIds }, classId: cls._id }).countDocuments();
    if (kids > 0) return cls;
  }
  throw forbidden();
}

/** Whether the user may see a student's records (progress, grades, attendance, remarks). */
export async function assertStudentAccess(user: AuthUser, studentId: string) {
  const student = await User.findOne({ _id: studentId, role: 'student' }).lean();
  if (!student) throw notFound('Student');
  switch (user.role) {
    case 'super_admin':
      return student;
    case 'partner':
    case 'school_admin':
      await assertSchoolAccess(user, student.schoolId);
      return student;
    case 'teacher': {
      if (!eq(student.schoolId, user.schoolId)) throw forbidden();
      const ids = await teacherClassIds(user.id);
      if (!student.classId || !ids.includes(String(student.classId))) throw forbidden();
      return student;
    }
    case 'student':
      if (eq(student._id, user.id)) return student;
      throw forbidden();
    case 'parent':
      if (user.childIds.includes(String(student._id))) return student;
      throw forbidden();
  }
  throw forbidden();
}

/** Course ids the user may open. Authoring access for super admins is handled separately. */
export async function accessibleCourseIds(user: AuthUser): Promise<string[] | 'all'> {
  switch (user.role) {
    case 'super_admin':
      return 'all';
    case 'partner': {
      const grants = await CourseGrant.find({ partnerId: user.partnerId }).select('courseId').lean();
      return grants.map((g) => String(g.courseId));
    }
    case 'school_admin': {
      // A school uses the courses granted to it directly (by Nanoskool or by its partner)
      const grants = await CourseGrant.find({ schoolId: user.schoolId }).select('courseId').lean();
      return [...new Set(grants.map((g) => String(g.courseId)))];
    }
    case 'teacher': {
      const cc = await ClassCourse.find({ teacherId: user.id }).select('courseId').lean();
      const ownClasses = await ClassSection.find({ classTeacherId: user.id }).select('_id').lean();
      const cc2 = await ClassCourse.find({ classId: { $in: ownClasses.map((c) => c._id) } }).select('courseId').lean();
      return [...new Set([...cc, ...cc2].map((c) => String(c.courseId)))];
    }
    case 'student': {
      if (!user.classId) return [];
      const cc = await ClassCourse.find({ classId: user.classId }).select('courseId').lean();
      return cc.map((c) => String(c.courseId));
    }
    case 'parent': {
      const kids = await User.find({ _id: { $in: user.childIds } }).select('classId').lean();
      const cc = await ClassCourse.find({ classId: { $in: kids.map((k) => k.classId).filter(Boolean) } })
        .select('courseId')
        .lean();
      return [...new Set(cc.map((c) => String(c.courseId)))];
    }
  }
  return [];
}

export async function assertCourseAccess(user: AuthUser, courseId: string) {
  const ids = await accessibleCourseIds(user);
  if (ids !== 'all' && !ids.includes(String(courseId))) throw forbidden('This course is not assigned to you');
}
