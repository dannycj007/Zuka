import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, ROLE_HOME_PATH } from "@/lib/profile";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { FeatureStrip } from "@/components/landing/feature-strip";
import { SystemFeatures } from "@/components/landing/system-features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TanzaniaSection } from "@/components/landing/tanzania-section";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default async function Home() {
  const supabase = await createClient();
  const result = await getProfile(supabase);

  if (result) {
    redirect(ROLE_HOME_PATH[result.profile.role]);
  }

  return (
    <main className="flex flex-1 flex-col">
      <LandingNav />
      <Hero />
      <FeatureStrip />
      <SystemFeatures />
      <HowItWorks />
      <TanzaniaSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
