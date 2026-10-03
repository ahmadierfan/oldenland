import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";
import Nav from "@/components/Nav";
import Origin from "@/components/Origin";
import Packaging from "@/components/Packaging";
import Saffron from "@/components/Saffron";
import World from "@/components/World";
import Export from "@/components/Export";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Preloader />
      <Nav />
      <main>
        <Origin />
        <Packaging />
        <Saffron />
        <World />
        <Export />
      </main>
      <Footer />
      <div className="grain" aria-hidden />
    </>
  );
}
