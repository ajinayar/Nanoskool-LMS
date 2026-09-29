import { Schema, model, type InferSchemaType, type HydratedDocument, Types } from 'mongoose';

export const ROLES = ['super_admin', 'partner', 'school_admin', 'teacher', 'student', 'parent'] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    role: { type: String, enum: ROLES, required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Students may not have an email address, so they can sign in with a username instead
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    username: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    phone: { type: String, trim: true },
    avatarUrl: String,
    passwordHash: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    lastLoginAt: Date,
    failedLogins: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },

    // Tenancy
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },

    // Student
    classId: { type: Schema.Types.ObjectId, ref: 'ClassSection', index: true },
    rollNo: String,
    dateOfBirth: Date,
    // Parent (or school, on paper) consent for the skills assessment and for photo/video evidence
    consent: {
      assessment: { type: Boolean, default: false },
      media: { type: Boolean, default: false },
      at: Date,
      by: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    interests: [String], // the child's own interests, used by the Learning GPS
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },

    // Parent: linked children (student user ids)
    childIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    relation: String,

    // Teacher
    subjects: [String],
    qualification: String,
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.failedLogins;
    delete ret.lockedUntil;
    delete ret.__v;
    return ret;
  },
});

export type UserT = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
