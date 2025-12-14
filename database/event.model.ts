import { Schema, model, models, type HydratedDocument, type Model } from 'mongoose';

export type EventDocument = HydratedDocument<IEvent>;
export type EventModel = Model<IEvent>;

export interface IEvent {
    title: string;
  slug?: string; // Auto-generated from title in pre-save.
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Stored as ISO date (YYYY-MM-DD).
  time: string; // Stored as 24h time (HH:mm).
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

// Generates a URL-friendly slug (lowercase, hyphen-separated, punctuation-stripped).
const slugify = (value: string): string => {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base;
};

// Normalizes various date inputs into ISO-8601 calendar date format (YYYY-MM-DD).
const normalizeDateToISO = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date format.');
  return d.toISOString().slice(0, 10);
};

// Normalizes times into 24-hour HH:mm (accepts HH:mm or h:mm AM/PM).
const normalizeTimeToHHMM = (value: string): string => {
  const v = value.trim();

  const m24 = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m24) return `${m24[1].padStart(2, '0')}:${m24[2]}`;

  const m12 = v.match(/^(\d{1,2}):([0-5]\d)\s*(am|pm)$/i);
  if (m12) {
    let hours = Number.parseInt(m12[1], 10);
    const minutes = m12[2];
    const meridiem = m12[3].toLowerCase();

    if (hours < 1 || hours > 12) throw new Error('Invalid time format.');
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  throw new Error('Invalid time format. Expected HH:mm or h:mm AM/PM.');
};

const requiredString = {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: (v: unknown) => isNonEmptyString(v),
    message: 'Field must be a non-empty string.',
  },
} as const;

const requiredStringArray = {
  type: [String],
  required: true,
  validate: {
    validator: (v: string[]) => Array.isArray(v) && v.length > 0 && v.every((s) => isNonEmptyString(s)),
    message: 'Field must be a non-empty array of non-empty strings.',
  },
} as const;

const EventSchema = new Schema<IEvent>(
  {
    title: requiredString,
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    description: requiredString,
    overview: requiredString,
    image: requiredString,
    venue: requiredString,
    location: requiredString,
    date: requiredString,
    time: requiredString,
    mode: requiredString,
    audience: requiredString,
    agenda: requiredStringArray,
    organizer: requiredString,
    tags: requiredStringArray,
  },
  {
    timestamps: true, // Auto-manage createdAt/updatedAt.
    strict: true,
  },
);

EventSchema.pre('save', function (this: EventDocument) {
  // Only regenerate slug when title changes.
  if (this.isModified('title')) {
    const nextSlug = slugify(this.title);
    if (!isNonEmptyString(nextSlug)) throw new Error('Unable to generate slug from title.');
    this.slug = nextSlug;
  }

  // Ensure date/time are stored consistently.
  this.date = normalizeDateToISO(this.date);
  this.time = normalizeTimeToHHMM(this.time);

  // Guard against whitespace-only values slipping through.
  const stringFields: Array<keyof Pick<
    IEvent,
    'title' | 'description' | 'overview' | 'image' | 'venue' | 'location' | 'date' | 'time' | 'mode' | 'audience' | 'organizer'
  >> = ['title', 'description', 'overview', 'image', 'venue', 'location', 'date', 'time', 'mode', 'audience', 'organizer'];

  for (const key of stringFields) {
    const value = this[key];
    if (!isNonEmptyString(value)) throw new Error(`${String(key)} is required.`);
  }

  if (!Array.isArray(this.agenda) || this.agenda.length === 0 || !this.agenda.every(isNonEmptyString)) {
    throw new Error('agenda is required and must contain at least one item.');
  }

  if (!Array.isArray(this.tags) || this.tags.length === 0 || !this.tags.every(isNonEmptyString)) {
    throw new Error('tags is required and must contain at least one item.');
  }

  if (!isNonEmptyString(this.slug)) throw new Error('slug is required.');
});

export const Event: EventModel =
  (models.Event as unknown as EventModel) || model<IEvent>('Event', EventSchema);

// Default export for compatibility with code importing the model as a default.
export default Event;
