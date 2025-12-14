import { Schema, model, models, type HydratedDocument, type Model, Types } from 'mongoose';
import { Event } from './event.model';

export type BookingDocument = HydratedDocument<IBooking>;
export type BookingModel = Model<IBooking>;

export interface IBooking {
  eventId: Types.ObjectId;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // Fast lookups by event.
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: unknown) => isNonEmptyString(v) && isValidEmail(String(v)),
        message: 'Invalid email format.',
      },
    },
  },
  {
    timestamps: true, // Auto-manage createdAt/updatedAt.
    strict: true,
  },
);

BookingSchema.pre('save', async function (this: BookingDocument) {
  // Ensure the booking always references an existing Event document.
  if (this.isNew || this.isModified('eventId')) {
    const exists = await Event.exists({ _id: this.eventId });
    if (!exists) throw new Error('Referenced event does not exist.');
  }
});

export const Booking: BookingModel =
  (models.Booking as unknown as BookingModel) || model<IBooking>('Booking', BookingSchema);

// Default export for compatibility with code importing the model as a default.
export default Booking;
