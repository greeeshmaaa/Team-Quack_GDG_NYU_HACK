"use client";

import { motion } from "framer-motion";
import {
  Accessibility,
  Building2,
  Compass,
  MapPinned,
  Route,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { CommunityResponse, FactItem } from "@/lib/types";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-mist/80">
      {children}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4"
    >
      <div className="flex items-center gap-2 text-white">
        <div className="rounded-xl bg-cyan/10 p-2 text-cyan">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}

function InsightCard({ text }: { text: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-4 py-3 text-sm leading-6 text-white/84">
      {text}
    </div>
  );
}

function buildFallbackBusinesses(response: CommunityResponse) {
  const placeKey = `${response.meta.neighborhood ?? ""} ${response.meta.borough ?? ""}`.toLowerCase();
  if (placeKey.includes("dumbo")) {
    return ["PowerHouse Books", "Butler Cafe", "Time Out Market", "Empire Stores"];
  }
  if (placeKey.includes("brooklyn")) {
    return ["Neighborhood cafe", "Independent bookstore", "Waterfront food hall"];
  }
  if (placeKey.includes("manhattan")) {
    return ["Corner cafe", "Family-run deli", "Independent gallery shop"];
  }
  return ["Neighborhood coffee shop", "Independent bookstore", "Local market"];
}

function buildFallbackTransit(response: CommunityResponse) {
  const landmark = response.landmark_name.toLowerCase();
  if (landmark.includes("bridge")) {
    return ["Bike & pedestrian bridge access", "Subway access nearby", "East River crossing access"];
  }
  return ["Subway access nearby", "Walkable street connections", "Bus access nearby"];
}

function buildCommunityImpact(response: CommunityResponse) {
  if (response.community_impact?.length) {
    return response.community_impact;
  }

  const impacts: string[] = [];
  if (response.transit_access.length) {
    impacts.push("Strong connectivity helps keep the area active for both daily users and destination visitors.");
  }
  if (response.accessibility.length) {
    impacts.push("Public access and walkability make the surrounding area easier to use beyond a single landmark visit.");
  }
  if (response.inequity_signals.length) {
    impacts.push(response.inequity_signals[0]);
  }
  if (!impacts.length) {
    impacts.push("This place influences how people move through the neighborhood and how nearby public space is experienced.");
  }
  if (response.meta.neighborhood) {
    impacts.push(`Local activity around ${response.meta.neighborhood} can benefit businesses while increasing pressure on shared infrastructure.`);
  }

  return impacts.slice(0, 4);
}

function buildLocalTouristDynamic(response: CommunityResponse) {
  if (response.local_tourist_dynamic?.length) {
    return response.local_tourist_dynamic;
  }

  const dynamics = [
    "Residents often use the area for movement or routine, while visitors tend to pause for views, photos, or destination moments.",
  ];
  if (response.transit_access.length) {
    dynamics.push("Peak activity can diverge between commuters passing through and tourists arriving in concentrated waves.");
  }
  return dynamics.slice(0, 2);
}

function buildDataSignals(response: CommunityResponse): FactItem[] {
  if (response.data_signals?.length) {
    return response.data_signals;
  }

  return [
    {
      label: "Foot traffic",
      value: response.transit_access.length ? "High" : "Moderate",
    },
    {
      label: "Walkability",
      value: response.accessibility.length ? "Excellent" : "Moderate",
    },
    {
      label: "Tourist density",
      value: response.meta.neighborhood === "DUMBO" ? "High" : "Moderate",
    },
  ];
}

export function CommunityCards({ response }: { response: CommunityResponse }) {
  const accessibility = response.accessibility;
  const equityLens = response.inequity_signals;
  const localBusinesses = response.local_businesses.length
    ? response.local_businesses
    : buildFallbackBusinesses(response);
  const transitAccess = response.transit_access.length
    ? response.transit_access
    : buildFallbackTransit(response);
  const communityImpact = buildCommunityImpact(response);
  const localTouristDynamic = buildLocalTouristDynamic(response);
  const dataSignals = buildDataSignals(response);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Community Summary</p>
        <p className="mt-3 text-[15px] leading-7 text-white/92">{response.summary}</p>
      </div>

      <div className="grid gap-3">
        {accessibility.length ? (
          <SectionCard icon={Accessibility} title="Accessibility">
            <div className="flex flex-wrap gap-2">
              {accessibility.map((item) => (
                <Chip key={item}>{item}</Chip>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {equityLens.length ? (
          <SectionCard icon={ShieldAlert} title="Equity Lens" delay={0.05}>
            <div className="flex flex-wrap gap-2">
              {equityLens.map((item) => (
                <Chip key={item}>{item}</Chip>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>

      <div className="space-y-3">
        <SectionCard icon={Building2} title="Local Businesses" delay={0.1}>
          <div className="flex flex-wrap gap-2">
            {localBusinesses.slice(0, 5).map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Route} title="Transit Access" delay={0.15}>
          <div className="flex flex-wrap gap-2">
            {transitAccess.slice(0, 5).map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Sparkles} title="Community Impact" delay={0.2}>
          <div className="space-y-2">
            {communityImpact.map((item) => (
              <InsightCard key={item} text={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Users} title="Local vs Tourist Dynamic" delay={0.25}>
          <div className="space-y-2">
            {localTouristDynamic.map((item) => (
              <InsightCard key={item} text={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={MapPinned} title="Data Signals" delay={0.3}>
          <div className="flex flex-wrap gap-2">
            {dataSignals.map((signal) => (
              <span
                key={`${signal.label}-${signal.value}`}
                className="rounded-full border border-cyan/16 bg-cyan/10 px-3 py-2 text-sm text-white/84"
              >
                <span className="text-cyan/88">{signal.label}:</span> {signal.value}
              </span>
            ))}
          </div>
        </SectionCard>

        {response.resources.length ? (
          <SectionCard icon={Compass} title="Nearby Community Anchors" delay={0.35}>
            <div className="flex flex-wrap gap-2">
              {response.resources.map((item) => (
                <Chip key={item}>{item}</Chip>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
