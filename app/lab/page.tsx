import SmoothScroll from "@/components/SmoothScroll";
import Packaging from "@/components/Packaging";

/** Prototype route for reviewing the 3D unboxing on its own. */
export default function Lab() {
  return (
    <>
      <SmoothScroll />
      <Packaging />
      <div className="h-screen bg-ink" />
    </>
  );
}
