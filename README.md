

Speak with light. Let glass listen. Let code translate the silence into conversation.

Project snapshot

EmpowerX is a software implementation for a smart glass system that helps deaf people communicate with hearing people (and vice versa) by translating sign language into speech/text and speech into sign or readable output. It combines on-device / edge ML sign-language recognition (custom-trainer), object-awareness (“Discover Me”), real-time voice search (FTSO-powered), and a secure auth + payment flow using JWT, bcrypt, Flare smart contracts and FAssets.

Short tagline: Sign. See. Speak. Pay. — accessibility at the speed of light.

Key features

Sign Language Recognition (SLR): camera -> custom ML model (trainer included) -> text / synthesized speech / subtitle overlay.

Discover Me: object detection API that annotates objects and can provide contextual info about nearby things (useful for situational awareness).

Voice Search (real-time): speech input processed to fetch real-time info/answers using Flare’s oracle/data tooling (FTSO/FDC integration is a core product focus). 
Flare
+1

Auth & Security: JWT for session tokens; passwords hashed with bcrypt; role-based routes for uploader/trainer/admin.

Payments & On-chain features: Smart contract integration on Flare for application-specific logic; payment and asset interoperability built on FAssets (Flare’s wrapped-asset system) for handling payments on-chain. 
dev.flare.network
+1

Admin Trainer UI: upload annotated video/image sets, kick off the custom trainer, monitor training progress, download model artifacts.

Offline-first UX: sign recognition runs with low-latency on-device inference where possible; cloud fallback for heavier tasks.

Why these choices? (honest coach moment)

Custom trainer — necessary: off-the-shelf SLR rarely matches domain-specific vocabularies (regional signs, user idiosyncrasies). You’ll get far better accuracy by training on your user data.

On-device inference + cloud hybrid — pragmatic: local inference gives speed and privacy; cloud gives heavy compute and centralized improvements.

FTSO / FAssets (Flare) — strategic: FTSO provides decentralized, probabilistic real-time data feeds that are robust for live voice-search pricing / oracle needs. FAssets is the Flare-native bridge to bring non-EVM tokens into DeFi/contract-compatible form — useful if you want on-chain payments using assets like XRP, BTC, DOGE. 
dev.flare.network
+1

JWT + bcrypt + on-chain verification — layered security: bcrypt for password safety, JWT for sessions, smart contracts for trust-minimized payment and attestation flows. Do not skip audits here.

Architecture (high-level)
[Smart Glass / App] <--> [Edge Inference (onnx/tflite)] 
        |                          \
        |                           -> [Backend API (Express/Flask)] <--> [ML Trainer / Model Store]
        |                                                         \
        |                                                          -> [FTSO / Flare Data Connector] (voice search / oracles) :contentReference[oaicite:3]{index=3}
        |
   Camera + Mic
        |
   UI overlay (subtitles / prompts)


Components:

Frontend (React): UI for live view, subtitles, trainer dashboard, payment UI.

Backend (Express or Flask): REST endpoints for auth, model uploads, inference fallback, payment endpoints.

ML Trainer: Python (PyTorch/TensorFlow) training pipeline, dataset ingestion, augmentation, export to ONNX/TFLite.

Blockchain layer: Solidity contracts (EVM-compatible) deployed to Flare; payment integration using FAssets flows.

FTSO integration: query and post results/requests to decentralized oracle for real-time data (voice-search metadata and pricing feeds).

Tech stack

Frontend: React, Vite, WebRTC for stream, Web Speech API (optional), Tailwind CSS

Backend: Node.js + Express (or Flask/Python)

ML: PyTorch or TensorFlow, ONNX conversion, TFLite for mobile/edge

Auth: JWT, bcrypt

Blockchain: Solidity smart contracts, Hardhat/Truffle, Flare network for deployment

Oracles / Data: Flare FTSO / FDC (for real-time feeds). 
dev.flare.network
+1

Storage: S3 / MinIO for media & model artifacts

CI / CD: GitHub Actions, Docker, and optional Kubernetes for scale
ML trainer — usage & tips

Input format: images/ + annotations.json (COCO or YOLOv5 compatible). Provide a script to convert common annotation formats.

Augmentations: rotation, brightness, occlusion — essential for dealing with camera tilt and glasses reflections.

Export: train in PyTorch, export to ONNX, run quantization and convert to TFLite for mobile/edge.

Evaluation: keep a separate per-user validation set — sign languages have personal variants.

Blockchain & Payments (Flare / FAssets / FTSO) — practical notes

FAssets: If you want users to pay in wrapped assets (e.g., FXRP), integrate FAssets bridge flows — minting/burning and custody paths are documented on Flare’s developer pages. Use FAssets for on-chain payments so you can accept assets that are not natively smart-contractable. 
dev.flare.network
+1

FTSO: Use FTSO to fetch decentralized, time-series data (price oracles and other feeds). For “voice search” where you want realtime, reliable off-chain info (e.g., price or real-world signals), FTSO provides enshrined oracle feeds. 
dev.flare.network
+1

Smart contracts: keep business logic minimal on-chain: payments, dispute resolution flags, receipts. Avoid privacy-sensitive logic on-chain.

Audits: FAssets and custom payment logic require security review. Treat audits as mandatory not optional.

Helpful official docs:

Flare Developer Hub (general). 
dev.flare.network

FTSO overview & docs. 
dev.flare.network

FAssets overview & docs. 
dev.flare.network

Deployment options — three ways (pick based on constraints)

Fast & cheap (Recommended for hack/prototype)

Frontend: Vercel / Netlify

Backend: Render / Railway (free tiers)

ML: Hosted training in Cloud VM; store model artifacts on S3.
Why: Minimal ops, quick iterations.

Production-ready (recommended when scaling)

Frontend: Vercel + CDN

Backend: Docker containers on AWS ECS / GCP Cloud Run or Kubernetes

ML: GPU worker pool (GCP/AWS), model registry, CI/CD for model signing

Contracts: deploy to Flare mainnet/testnet via Hardhat + secure key management (HSM or vault).
Why: Reliability, autoscaling, better logging & monitoring.

Edge-first (privacy & low latency)

Run inference on-device (mobile/embedded TFLite), sync model improvements via background uploads to server for retraining.

Use backend only for heavy tasks and payments.
Why: Best latency and privacy for users wearing the glasses.