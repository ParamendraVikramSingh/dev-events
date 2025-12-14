import {
    Schema,
    model,
    models,
    type HydratedDocument,
    type Model,
    Types,
} from "mongoose";
import { Event } from "./event.model";

export type BookingDocument = HydratedDocument<IBooking>;
export type BookingModel = Model<IBooking>;

export interface IBooking {
    eventId: Types.ObjectId;
    slug: string;
    email: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const isValidEmail = (value: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const BookingSchema = new Schema<IBooking>(
    {
        eventId: {
            type: Schema.Types.ObjectId,
            ref: "Event",
            required: true,
            index: true,
        },

        slug: {
            type: String,
            required: true,
            trim: true,
            index: true, // helpful for queries
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: (v: unknown) =>
                    isNonEmptyString(v) && isValidEmail(String(v)),
                message: "Invalid email format.",
            },
        },
    },
    {
        timestamps: true,
        strict: true,
    }
);

BookingSchema.pre("save", async function (this: BookingDocument) {
    if (this.isNew || this.isModified("eventId")) {
        const exists = await Event.exists({ _id: this.eventId });
        if (!exists) throw new Error("Referenced event does not exist.");
    }
});

export const Booking: BookingModel =
    (models.Booking as unknown as BookingModel) ||
    model<IBooking>("Booking", BookingSchema);

export default Booking;
