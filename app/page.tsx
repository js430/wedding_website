import Intro from "@/components/Intro";
import Ornament from "@/components/Ornament";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import OurStory from "@/components/OurStory";
import JourneyMap from "@/components/JourneyMap";
import EventDetails from "@/components/EventDetails";
import Gallery from "@/components/Gallery";
import RingsSection from "@/components/RingsSection";
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
        <JourneyMap />
        <Ornament />
        <EventDetails />
        <Gallery />
        <RingsSection />
        <Ornament />
        <RSVP />
      </main>
      <Footer />
    </>
  );
}
