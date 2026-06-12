import Intro from "@/components/Intro";
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
        <EventDetails />
        <Gallery />
        <RSVP />
      </main>
      <Footer />
    </>
  );
}
