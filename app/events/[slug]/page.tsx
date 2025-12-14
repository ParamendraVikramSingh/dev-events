import { notFound } from "next/navigation";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";
import { IEvent } from "@/database/event.model";
import { getSimilarEventsBySlug } from "@/lib/actions/event.actions";
import EventCard from "@/components/EventCard";
import { Suspense } from "react";

const APP_URL =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const EventDetailsItem = ({ icon, alt, label}: {icon: string; alt: string; label: string}) => (
    <div className="flex-row-gap-2 items-center">
        <Image src={icon} alt={alt} width={17} height={17}/>
        <p>{label}</p>
    </div>
)

const EventAgenda = ({agendaItems}: {agendaItems:string[]}) => (
    <div className="agenda">
        <h2 className="mt-10">Agenda</h2>
        <ul>
            {agendaItems.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    </div>
)

const EventTags = ({tags}: {tags:string[]}) => (
    <div className="flex flex-row gap-1.5 flex-wrap">
        {tags.map((tag) => (
            <div className="pill" key={tag}>{tag}</div>
        ))}
    </div>
)

const EventDetails = async ({
    params,
}: {
    params: { slug: string } | Promise<{ slug: string }>;
}) => {
    const { slug } = await Promise.resolve(params);

    const request = await fetch(`${APP_URL}/api/events/${slug}`, { cache: 'no-store' });

    if (!request.ok) return notFound();

    const data: any = await request.json();
    const event = data?.event;
    if (!event) return notFound();

    const {
        description,
        image,
        overview,
        date,
        time,
        location,
        mode,
        agenda,
        audience,
        tags,
        organizer,
    } = event;

    if(!description)return notFound();

    // Agenda is stored in Mongo as string[]. Older records may contain a single JSON/CSV string.
    const agendaItems: string[] = (() => {
        if (!Array.isArray(agenda) || agenda.length === 0) return [];

        if (agenda.length === 1 && typeof agenda[0] === 'string') {
            const raw = agenda[0].trim();

            // Try JSON first (e.g. "[\"Intro\",\"Q&A\"]").
            try {
                const parsed: unknown = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string' && x.trim().length > 0)) {
                    return parsed.map((x) => x.trim());
                }
            } catch {
                // Fall through to CSV splitting.
            }

            // Fallback: accept comma/newline separated values.
            return raw
                .split(/[\n,]/g)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
        }

        // Default: agenda already arrives as an array of strings.
        return (agenda as unknown[])
            .filter((x): x is string => typeof x === 'string')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    })();

    const bookings = 10;

    const similarEvents: IEvent[] = await getSimilarEventsBySlug(slug);

    return (
        <section id="event">
           <div className="header">
               <h1>Event Description</h1>
               <p>{description}</p>
           </div>
            <div className="details">                {/* Left Side - Event Content */}
                <div className="content">
                    <Image src={image} alt="Event Banner" width={800} height={800} className="banner" />

                    <section className="flex-col-gap-2">
                        <h2>Overview</h2>
                        <p>{overview}</p>
                    </section>

                    <section className="flex-col-gap-2">
                        <h2>Event Details</h2>

                        <EventDetailsItem icon="/icons/calendar.svg" alt="calendar" label={date}/>
                        <EventDetailsItem icon="/icons/clock.svg" alt="clock" label={time}/>
                        <EventDetailsItem icon="/icons/pin.svg" alt="pin" label={location}/>
                        <EventDetailsItem icon="/icons/mode.svg" alt="mode" label={mode}/>
                        <EventDetailsItem icon="/icons/audience.svg" alt="audience" label={audience}/>
                    </section>


                    <EventAgenda agendaItems={agendaItems} />

                    <section className="flex-col-gap-2">
                        <h2>About the Organizer</h2>
                        <p>{organizer}</p>
                    </section>
                    
                    <EventTags tags={Array.isArray(tags) ? tags : []}/>
                </div>


                {/* Right Side - Booking Form */}
                <aside className="booking">
                    <div className="signup-card">
                        <h2>Book Your Spot</h2>
                        {bookings > 0 ?(
                          <p className="text-sm">
                              Join {bookings} people who have already booked their spot!
                          </p>
                        ):(
                            <p className="text-sm">Be the first to book your spot!</p>
                        )}
                        <BookEvent />
                    </div>
                </aside>

            </div>

            <div className="flex w-full flex-col gap-4 pt-20">
                <h2>Similar Events</h2>
                <div className="events">
                    {similarEvents.length > 0 && similarEvents.map((similarEvent: IEvent) => (
                        <EventCard key={similarEvent.title} {...similarEvent} />
                    ))}
                </div>
            </div>
        </section>
    )
}

const EventDetailsPage = ({ params }: { params: { slug: string } | Promise<{ slug: string }> }) => {
    return (
        <Suspense fallback={<div />}>
            <EventDetails params={params} />
        </Suspense>
    );
};

export default EventDetailsPage
