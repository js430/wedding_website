import Intro from "@/components/Intro";
import Marquee from "@/components/Marquee";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import OurStory from "@/components/OurStory";
import EventDetails from "@/components/EventDetails";
import Gallery from "@/components/Gallery";
import RSVP from "@/components/RSVP";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Intro />
      <Navbar />
      <main>
        <Hero />
        <OurStory />
        <Marquee />
        <EventDetails />
        <Gallery />
        <Marquee />
        <RSVP />
      </main>
      <Footer />
    </>
  );
}
