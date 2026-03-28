# NYC Lens (Team Name: Quack)

## PROJECT SUMMARY

NYC Lens is a camera-first, AI-powered civic exploration platform that transforms New York City into a living, interactive museum. By leveraging Google Cloud's Vertex AI (Gemini 3.1 Flash multimodal) and NYC Open Data, NYC Lens empowers users to point their camera at any landmark or place and instantly unlock rich, contextual stories, Q&A, and community insights—bridging the gap between what we see and what we understand.

---

# Overview

**NYC Lens: See. Understand. Belong.**

NYC Lens reimagines New York City as a living museum, where every street, landmark, and neighborhood tells a story. While people experience cities visually, they often lack the context to truly understand their surroundings. NYC Lens overlays a camera-first AI lens on the city, transforming everyday exploration into an interactive, insightful journey.

---

# Problem Statement

- NYC Open Data is vast but largely inaccessible to the public.
- Residents and tourists see places but rarely understand their significance, history, or community context.
- There is a persistent gap between visual experience and contextual understanding, limiting civic engagement and discovery.

---

# Solution

NYC Lens is a real-time, AI-powered civic intelligence layer for urban exploration. Through a camera-first interface, it uses multimodal and agentic AI to deliver instant, contextual insights about the city—making open data accessible, engaging, and actionable for everyone.

---

# Key Features

- **Landmark Detection:** Instantly recognizes NYC landmarks and places using Gemini multimodal vision on Vertex AI.
- **Ask Mode:** Natural Q&A via voice or text for on-the-spot curiosity.
- **Story Mode:** Immersive storytelling—past, present, and future-about any location.
- **Community Mode:** Accessibility, transit, and civic infrastructure insights for inclusive exploration.

---

# Multi-Agent Architecture

NYC Lens is powered by a modular, multi-agent system:

- **Orchestrator Agent:** The central brain, routing tasks and managing agent-to-agent (A2A) communication.
- **Landmark Detection Agent:** Identifies and verifies landmarks using multimodal inputs.
- **Clarification Agent:** Resolves ambiguities (e.g., similar landmarks, unclear images) using geolocation and context.
- **Ask Agent:** Handles user Q&A, leveraging open data and AI.
- **Story Agent:** Crafts narratives about places, blending history, culture, and future projections.
- **Community Agent:** Surfaces accessibility, transit, and civic data for community impact.

**How it works:**
- The Orchestrator Agent receives user input and coordinates specialized agents.
- Agents communicate via A2A protocols, sharing context and results.
- Data flows seamlessly between agents, enabling modular, scalable intelligence.
- This architecture outperforms single-model systems by enabling specialization, parallelism, and robust fallback logic.

---

# System Architecture

**Flow:**

Camera → Backend (FastAPI) → Vertex AI (Gemini) → Orchestrator → Specialized Agents → UI (Next.js)

- Real-time, multimodal AI pipeline
- Fallback logic for ambiguous cases
- Modular agent orchestration for scalability and maintainability

**Diagram:**

```
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant VertexAI
    participant Orchestrator
    participant Agents
    User->>Frontend: Capture Image/Query
    Frontend->>Backend: Send Data
    Backend->>VertexAI: Multimodal Inference
    VertexAI->>Orchestrator: Results
    Orchestrator->>Agents: Delegate Tasks
    Agents->>Orchestrator: Responses
    Orchestrator->>Frontend: Final Output
    Frontend->>User: Display Insights
```

---

# Google Cloud Integration

- **Vertex AI:** Gemini 3.1 Flash multimodal for vision + language understanding
- **GenAI SDK / ADK:** Production-grade AI integration
- **Cloud Run:** Scalable, serverless deployment for backend and agents
- **Cloud-Native Design:** Built for reliability, scalability, and rapid iteration

---

# Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python)
- **AI:** Vertex AI, Gemini multimodal
- **Data:** NYC Open Data
- **Infrastructure:** Cloud Run, Docker

---

# Data Pipeline

- Ingests and preprocesses NYC Open Data (landmarks, parks, civic sites)
- Generates unified datasets (e.g., `unified_places.json`, `landmark_context.json`)
- Structured ingestion enables fast, accurate inference and storytelling

---

# Business Impact + Tech for Good

NYC Lens bridges the gap between visual experience and contextual understanding:

- **Transforms data into:**
  - Visual, interactive, real-time insights
  - Accessible knowledge for all
- **Impact:**
  - Residents: Deeper connection to their city
  - Tourists: Enriched exploration and discovery
  - All ages: Engaging, educational experiences
  - Accessibility: Disability-friendly navigation and information
  - Community: Civic awareness and participation
- **Equality:**
  - Designed to be unbiased—no racial, social, or geographic bias
  - Focuses on inclusivity and equal access
- **Google Principle:**
  - "Focus on the user and all else will follow"
- **Beyond typical tech-for-good:**
  - Production-ready, scalable, and designed for real-world impact

---

# Scalability

- Easily extensible to other cities and regions
- Partnership potential:
  - Tourism boards
  - Educational institutions
  - Urban platforms
  - Cultural organizations

---

# Demo Flow

1. User opens NYC Lens and points camera at a landmark
2. System detects and identifies the place in real time
3. User selects a mode: Ask, Story, or Community
4. Receives instant, multimodal insights and stories
5. Engages with the city like never before

---

# Future Scope

- AR overlays for immersive exploration
- Expansion to global cities
- Personalization and user profiles
- Live community data and event integration

---

# Team & Contact

**University:** New York University, Tandon School of Engineering

**Team Members:**
- Greeshma Laxmikant Hedvikar — greeshmahedvikar18@gmail.com
- Rujuta Amit Joshi - rajoshi111202@gmail.com
- Lavanya Nandan Deole - lavanya10feb@gmail.com
- Isha Harish - theishaharish@gmail.com

---

# References

- NYC Open Data: https://opendata.cityofnewyork.us/
- Google Cloud Vertex AI: https://cloud.google.com/vertex-ai
- FastAPI: https://fastapi.tiangolo.com/
- Next.js: https://nextjs.org/

---

# Get Started

1. Clone the repo
2. Set up Google Cloud credentials and Vertex AI access
3. Install dependencies (`pip install -r requirements.txt` and `npm install` in frontend)
4. Run backend (`uvicorn app.main:app --reload`)
5. Run frontend (`npm run dev`)
6. Explore NYC like never before!

---

# Built for the Google Cloud + GenAI Hackathon

NYC Lens is a hackathon-winning project, designed for real-world deployment and social impact. Join us in making cities more accessible, engaging, and understood by all.
