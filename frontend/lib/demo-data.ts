// import { AnalyzeResponse, DetectResponse, Mode } from "@/lib/types";

// const baseMeta = {
//   session_id: "demo-session",
//   landmark_confidence: 0.91,
//   borough: "Brooklyn",
//   neighborhood: "DUMBO",
//   civic_focus: true,
// };

// export function getDemoResponse(mode: Mode, hint?: string): AnalyzeResponse {
//   const landmark = hint && hint.trim() ? hint.trim() : "Brooklyn Bridge";

//   if (mode === "ask") {
//     return {
//       type: "ask",
//       title: landmark,
//       landmark_name: landmark,
//       answer:
//         `${landmark} is both an engineering landmark and a civic symbol. It connected Brooklyn and Manhattan in a way that reshaped how New Yorkers moved, worked, and imagined the city.`,
//       facts: [
//         { label: "Borough", value: "Brooklyn / Manhattan" },
//         { label: "Neighborhood", value: "DUMBO" },
//         { label: "Why It Matters", value: "It turned infrastructure into part of NYC's identity." },
//       ],
//       meta: {
//         ...baseMeta,
//         mode,
//         agent: "ask_agent",
//         multimodal_ready: false,
//         used_fallback: true,
//       },
//       sources: [
//         { label: "Landmark dataset", kind: "json" },
//         { label: "Demo fallback", kind: "derived" },
//       ],
//     };
//   }

//   if (mode === "story") {
//     return {
//       type: "story",
//       title: landmark,
//       landmark_name: landmark,
//       story: {
//         past: "Built as a bold feat of labor, risk, and ambition, it helped prove New York could engineer its own myths.",
//         present: "Today it frames tourists, commuters, cyclists, and locals in the same cinematic sweep across the East River.",
//         future: "It can keep evolving from icon into civic classroom, helping people ask who cities are built for and how public spaces endure.",
//       },
//       story_panels: [
//         {
//           kind: "narrative",
//           title: "Past",
//           body: "Built as a bold feat of labor, risk, and ambition, it helped prove New York could engineer its own myths.",
//         },
//         {
//           kind: "narrative",
//           title: "Present",
//           body: "Today it frames tourists, commuters, cyclists, and locals in the same cinematic sweep across the East River.",
//         },
//         {
//           kind: "narrative",
//           title: "Future",
//           body: "It can keep evolving from icon into civic classroom, helping people ask who cities are built for and how public spaces endure.",
//         },
//         {
//           kind: "context",
//           title: "Place Context",
//           body: "Seen from DUMBO, the bridge becomes both scenery and neighborhood infrastructure.",
//         },
//         {
//           kind: "narration",
//           title: "Narration Cue",
//           body: "Read this as a three-beat city story: memory, movement, and civic future.",
//         },
//       ],
//       narration_text:
//         "Brooklyn Bridge. In the past, it was a feat of labor and ambition. Today, it carries the drama of daily city life. In the future, it can keep teaching New Yorkers what public infrastructure means.",
//       meta: {
//         ...baseMeta,
//         mode,
//         agent: "story_agent",
//         multimodal_ready: true,
//         used_fallback: true,
//       },
//       sources: [
//         { label: "Landmark dataset", kind: "json" },
//         { label: "Demo fallback", kind: "derived" },
//       ],
//     };
//   }

//   return {
//     type: "community",
//     title: "Community Lens",
//     landmark_name: landmark,
//     summary:
//       `${landmark} matters beyond tourism because the space around it links transit, public waterfront access, local business activity, and neighborhood identity.`,
//     highlights: [
//       "Accessibility: Nearby subway access, walkable streets",
//       "Transit: F train nearby, East River Ferry access",
//       "Local businesses: PowerHouse Books, Butler Cafe",
//       "Equity lens: Public-space access is strong, but commercial pressure can skew toward visitors.",
//     ],
//     resources: ["Brooklyn Bridge Park", "Subway access nearby"],
//     accessibility: ["Nearby subway access", "Walkable streets", "Waterfront public space"],
//     local_businesses: ["PowerHouse Books", "Butler Cafe"],
//     transit_access: ["F train nearby", "East River Ferry access", "Bike and pedestrian bridge approach"],
//     inequity_signals: [
//       "Public-space access is strong, but nearby commercial activity can skew toward visitors over long-term residents.",
//       "High tourist visibility can raise pressure on local affordability.",
//     ],
//     community_impact: [
//       "Heavy visitor flow supports local commerce but can add pressure to sidewalks, waterfront space, and cleanup needs.",
//       "Strong pedestrian access helps residents use the area beyond tourism moments.",
//       "Public-facing infrastructure keeps the neighborhood visible and active throughout the day.",
//     ],
//     local_tourist_dynamic: [
//       "Residents often use the area for movement and daily routines, while visitors linger for views and photos.",
//       "Peak hours can feel different for commuters than they do for destination-driven visitors.",
//     ],
//     data_signals: [
//       { label: "Foot traffic", value: "High" },
//       { label: "Walkability", value: "Excellent" },
//       { label: "Tourist density", value: "High" },
//       { label: "Civic pressure", value: "Elevated" },
//     ],
//     meta: {
//       ...baseMeta,
//       mode,
//       agent: "community_agent",
//       multimodal_ready: false,
//       used_fallback: true,
//     },
//     sources: [
//       { label: "Community profile dataset", kind: "json" },
//       { label: "Demo fallback", kind: "derived" },
//     ],
//   };
// }

// export function getDemoDetectResponse(hint?: string): DetectResponse {
//   const landmark = hint && hint.trim() ? hint.trim() : "Brooklyn Bridge";

//   return {
//     type: "detection_preview",
//     title: landmark,
//     landmark_name: landmark,
//     subtitle: "Recognized in DUMBO, Brooklyn",
//     overview:
//       "Landmark recognized. Choose Ask for grounded facts, Story for a cinematic interpretation, or Community for neighborhood impact.",
//     meta: {
//       ...baseMeta,
//       mode: "detect",
//       agent: "landmark_agent",
//       multimodal_ready: true,
//       used_fallback: true,
//     },
//     sources: [
//       { label: "Landmark dataset", kind: "json" },
//       { label: "Demo fallback", kind: "derived" },
//     ],
//   };
// }
