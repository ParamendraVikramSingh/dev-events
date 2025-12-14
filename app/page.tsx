import ExploreBtn from "@/components/ExploreBtn";
import EventCard from "@/components/EventCard";
import { IEvent } from "@/database/event.model";
import { Suspense } from "react";

const APP_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const EventsSection = async () => {
  const response = await fetch(`${APP_URL}/api/events`, { cache: "no-store" });
  const { events } = await response.json();

  return (
    <div className={"mt-20 space-y-7"}>
      <h3>Featured Events</h3>

      <ul className={"events"}>
        {events && events.length > 0 &&
          events.map((event: IEvent) => (
            <li key={event.title}>
              <EventCard {...event} />
            </li>
          ))}
      </ul>
    </div>
  );
};

const Page = () => {
  return (
    <section>
      <h1 className={"text-center"}>
        The Hub for Every Dev <br /> Event You Can't Miss
      </h1>
      <p className={"text-center mt-5"}>
        Hackathon, Meetups, and Conferences, All in One Place
      </p>
      <ExploreBtn />

      <Suspense fallback={<div />}>
        <EventsSection />
      </Suspense>
    </section>
  );
};

export default Page;
