import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";
import Nav from "@/components/Nav";
import Origin from "@/components/Origin";
import Unboxing from "@/components/Unboxing";
import Craft from "@/components/Craft";
import Saffron from "@/components/Saffron";
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
        <Unboxing />
        <Craft />
        <Saffron />
        <Export />
      </main>
      <Footer />
      <div className="grain" aria-hidden />
    </>
  );
}
