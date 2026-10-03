# ☁️ CloudGuard - The Ultimate Architecture & Project Guide
This document serves as the "brain dump" for the entire CloudGuard Dashboard project. If you ever forget how something works, this guide explains every keyword, technology, and architectural flow in the system.
## 🛠️ The Tech Stack (What We Used & Why)
1. **Next.js (App Router)**
   - **Why:** Next.js is a React framework that allows us to write both frontend UI and backend API routes in the exact same project. We used the modern App Router (`/src/app` directory) which allows for Server-Side Rendering (SSR) and seamless serverless deployment on Vercel.
2. **MongoDB & Mongoose**
   - **Why:** A NoSQL database that stores our Users, Apps, and Azure Tokens. We used Mongoose as the ODM (Object Data Modeling) library to define strict schemas (e.g., `src/models/app.ts`) so we don't accidentally save corrupted data.
3. **Tailwind CSS & Lucide React**
   - **Why:** Tailwind provides utility classes to rapidly build the sleek, dark-mode, neon-glowing UI without writing custom CSS files. Lucide React provides the clean SVG icons used throughout the dashboard.
4. **Vercel Blob Storage**
   - **Why:** When a user uploads a `.zip` file of their code, we need somewhere to temporarily hold it before handing it to Azure. Vercel Blob is a lightning-fast, serverless S3 alternative.
5. **Upstash QStash (Background Workers)**
   - **Why:** Vercel serverless functions crash if they run longer than 60 seconds. Deploying to Azure takes over a minute. QStash acts as a background queue—it takes the `.zip` file, safely runs the deployment in the background, and prevents the user's browser from timing out.
6. **Azure SDK (`@azure/arm-appservice`, `@azure/arm-resources`)**
   - **Why:** Microsoft's official Node.js libraries. We use these in our background workers to programmatically create Azure Resource Groups and Web Apps via code, bypassing the Azure Portal entirely.
7. **Visx (Data Visualization)**
   - **Why:** Used to render the beautiful Pie Charts on the dashboard to visualize Budget vs Cost.
---
## 🔑 The Core Workflows (How Things Talk to Each Other)
### 1. Azure OAuth & Authentication (The "Link Account" Flow)
* **Goal:** Get permission to control the student's Azure account.
* **Flow:** 
  1. User clicks "Connect Azure" -> Hits `/api/auth/azure`.
  2. The server redirects them to Microsoft's official login page.
  3. Microsoft redirects back to `/api/auth/azure/callback` with an **Authorization Code**.
  4. The backend exchanges that code for an **Access Token** and a **Refresh Token**.
  5. *Security:* The tokens are securely encrypted using Node.js `crypto` (`src/utils/encryption.ts`) and stored in MongoDB.
### 2. The Deployment Pipeline (The Heavy Lifter)
* **Goal:** Take a `.zip` file and make it live on Azure.
* **Flow:**
  1. User uploads a `.zip` file in the UI (`/dashboard/deploy/[appId]/prepare`).
  2. Next.js saves the zip to **Vercel Blob** to get a temporary public URL.
  3. Next.js pings **Upstash QStash**, saying: *"In the background, please hit my `/api/workers/deploy` route and give it this zip URL."*
  4. The QStash worker decrypts the user's Azure Token.
  5. It uses the **Azure SDK** to create a Resource Group, an App Service Plan (Free Tier `F1`), and the Web App.
  6. It uploads the `.zip` via the Azure Kudu API (`/api/zipdeploy`).
  7. Throughout this process, it constantly updates `app.deployStatus` in MongoDB so the frontend UI can show real-time progress (Uploaded -> Provisioning -> Live).
### 3. The Monitor & Auto-Shutdown System (The Money Saver)
* **Goal:** Never let a student burn through their $100 free credits.
* **Flow:**
  1. User sets a **Soft Budget** (Alert) and a **Hard Limit** (Auto-Stop) in the UI.
  2. A Vercel Cron Job runs every hour, pinging `/api/monitor/check-budgets`.
  3. The API pulls all apps from MongoDB that have `autoStop` enabled.
  4. It calls the **Azure Cost Management API** using a precise `ResourceId` filter (`src/utils/azure-cost.ts`) to get the exact cost of that specific app.
  5. If `cost > hardLimit`, it uses the Azure SDK to forcefully shut down the container (`stopAzureApp()`).
### 4. Live Docker Logs (The Debugger)
* **Goal:** Show real-time terminal logs without running up our own server bills.
* **Flow:**
  1. Instead of using WebSockets (which cost money and timeout on serverless), the React frontend uses **Short Polling**.
  2. Every 3 seconds, the frontend hits `/api/apps/[appId]/logs`.
  3. The backend calls the Azure Kudu Log API, fetches the latest raw text file, and streams it back to the browser window.
---
## 📁 Key File Directory (Where Things Live)
* `src/app/api/auth/azure/` -> Everything related to Microsoft login and Token generation.
* `src/app/api/workers/deploy/route.ts` -> The background job that actually writes code to Azure.
* `src/app/api/monitor/check-budgets/route.ts` -> The Cron Job that shuts down expensive apps.
* `src/app/(auth)/dashboard/` -> The frontend React pages for the Dashboard, Deploy UI, and Monitor UI.
* `src/utils/azure-cost.ts` -> The secret sauce query that extracts per-app cost from Azure Cost Management.
* `src/utils/encryption.ts` -> The security layer protecting the Azure tokens.
* `src/models/` -> Mongoose database schemas (App, User, ResourceGroup).
---
## 🎤 Interview Talking Points (How to sound like a Senior Engineer)
If you talk about this project in an interview, make sure to drop these exact concepts:
1. **"I utilized a Fan-Out Background Worker Architecture."**
   * *Explanation:* Explain that you knew Vercel Serverless Functions timeout after 60 seconds. So instead of doing a 2-minute Azure deployment synchronously, you decoupled the heavy lifting to an asynchronous message queue (Upstash QStash).
2. **"I designed a Read-Optimized Database schema."**
   * *Explanation:* Explain that you added indexing to the `autoStop` boolean in MongoDB because the auto-shutdown cron job heavily queries the DB every hour (read-heavy), while users only update their budgets rarely (write-light).
3. **"I handled Enterprise-Grade Security for OAuth Tokens."**
   * *Explanation:* Explain that you didn't just store plaintext Azure tokens in the database. You built a symmetric AES-256-GCM encryption layer using Node's native `crypto` library, ensuring that a database leak wouldn't compromise user's Azure accounts.
4. **"I built a centralized cost-protection layer on top of a decentralized cloud."**
   * *Explanation:* Explain that native Azure Action Groups require highly elevated RBAC permissions to create automatically. Instead, you engineered a centralized cron job on your own servers that utilizes the Cost Management API to protect users without demanding admin-level permissions from their accounts.
---
*Created with ❤️ for the ultimate Azure deployment platform.*





# ☁️ CloudGuard - The Ultimate Architecture & Project Guide

This document serves as the "brain dump" for the entire CloudGuard Dashboard project. It is designed to act as your ultimate study guide for system design interviews, explaining not just *what* we built, but the *why*, the alternatives we rejected, and the trade-offs we accepted.

---

## 🛠️ The Tech Stack (Decisions & Trade-offs)

### 1. Database: MongoDB (NoSQL) vs SQL (PostgreSQL/MySQL)
* **What we used:** MongoDB with Mongoose (ODM).
* **Why we chose it:** CloudGuard heavily relies on storing dynamic environment variables, JSON logs, and unstructured Azure response data. NoSQL excels at handling dynamic, nested JSON payloads without requiring strict schema migrations every time Azure changes their API response format.
* **Alternative (SQL):** We could have used PostgreSQL with an ORM like Prisma.
* **Trade-off:** SQL provides better ACID compliance and strict relational integrity (e.g., ensuring an App cannot exist if a User is deleted). However, setting up SQL relations for the highly nested Azure Resource configurations would have significantly slowed down development speed (MVP phase) and required complex join tables for simple environment variables.

### 2. Backend/Frontend: Next.js (App Router) vs Separate React + Node/Express
* **What we used:** Next.js (App Router) deployed on Vercel.
* **Why we chose it:** Next.js allows us to colocate our UI and API routes in a single monorepo. When building a dashboard, Server-Side Rendering (SSR) allows us to fetch the user's Azure session securely on the server before the page even loads, eliminating UI layout shift and protecting tokens.
* **Alternative:** A standard React SPA (Single Page Application) talking to a separate Express.js Node server.
* **Trade-off:** A separate Express server would give us long-running processes (no 60-second timeouts) and WebSockets natively. However, it requires managing two separate codebases, dealing with CORS issues, and paying for dedicated server hosting (e.g., AWS EC2) instead of leveraging Vercel's free serverless tier.

### 3. Background Workers: Upstash QStash vs AWS SQS / Redis BullMQ
* **What we used:** Upstash QStash (Serverless Message Queue).
* **Why we chose it:** Because we chose Vercel Serverless (which times out after 60s), we *needed* a background queue for the 2-minute Azure deployments. QStash requires zero infrastructure setup—it just hits our webhook via HTTP.
* **Alternative:** Redis with BullMQ, or AWS SQS.
* **Trade-off:** BullMQ requires a constantly running Node process to consume the queue, completely breaking the Vercel serverless model. AWS SQS is powerful but introduces heavy AWS SDK dependencies and IAM role complexities just for a simple queuing mechanism.

### 4. File Storage: Vercel Blob vs AWS S3
* **What we used:** Vercel Blob.
* **Why we chose it:** To pass the user's `.zip` file from the frontend to the background QStash worker, we needed a temporary public URL. Vercel Blob requires literally one line of code (`put()`) and is natively integrated into our Vercel environment.
* **Alternative:** AWS S3 or Azure Blob Storage.
* **Trade-off:** AWS S3 is the industry standard and significantly cheaper at scale, but requires managing IAM policies, CORS configurations, and signed URLs just to upload a 5MB zip file.

---

## 🔑 Core Workflows & Architectural Decisions

### 1. The Auto-Shutdown System (Centralized Polling vs Event-Driven)
* **How it works:** A cron job pings `/api/monitor/check-budgets` every hour. Our server queries the DB for `autoStop: true` apps, pulls their cost from Azure via REST API, and shuts them down if the budget is breached.
* **Why this approach (Centralized Polling):** It gives us complete control over the logic and requires very minimal Azure permissions from the user. We only need the ability to read costs and stop the app.
* **Alternative (Event-Driven):** Programmatically creating native Azure Budget Action Groups on the user's account that send webhooks to our server when limits are hit.
* **Trade-off:** Event-driven architecture eliminates polling and scales infinitely. However, it forces the user to grant us high-level `Owner/Contributor` RBAC permissions to create Action Groups on their behalf, which many enterprise users or university students are blocked from doing.

### 2. Live Docker Logs (Short Polling vs WebSockets/SSE)
* **How it works:** The React frontend fetches `/api/apps/[appId]/logs` every 3 seconds to get the latest Kudu text logs.
* **Why this approach:** Serverless functions cannot maintain a persistent 5-minute WebSocket connection. Short polling completely bypasses serverless timeout limits.
* **Alternative:** Server-Sent Events (SSE) or WebSockets.
* **Trade-off:** WebSockets are much more efficient for the network and provide true real-time streaming, but they demand a dedicated, persistent server (like an EC2 instance or Azure Web PubSub), which breaks our goal of a fully serverless, zero-maintenance architecture.

---

## 🎤 Interview Q&A (Be Prepared for These)

**Q: "I see you used Vercel Serverless. What happens if an Azure deployment takes 5 minutes? Won't your API timeout?"**
**A:** "Exactly, Vercel has a hard 60-second limit. That's why I decoupled the deployment logic using a Fan-Out pattern with Upstash QStash. The Next.js API immediately responds to the user's browser in under 1 second, while QStash handles the long-running deployment asynchronously in the background. If it fails, QStash automatically handles the retries."

**Q: "Polling the Azure Cost API every hour for 10,000 users seems slow. How would you scale this?"**
**A:** "Currently, it runs in a single synchronous loop, which is fine for an MVP. To scale, I would shift to a Fan-Out architecture. The cron job would just read the MongoDB index for `autoStop: true`, and then publish 10,000 separate events to the QStash queue. Vercel would then spin up hundreds of parallel edge functions to process the budget checks concurrently, completely removing the bottleneck."

**Q: "Why did you use MongoDB? A relational database seems better for linking Users to Apps."**
**A:** "While SQL provides better relational integrity, I chose MongoDB because the Azure Cost API and Kudu Deployment APIs return massive, unpredictable, deeply nested JSON payloads. NoSQL allowed me to rapidly iterate on the MVP without writing complex SQL migration scripts every time I wanted to store a new Azure metadata field."

**Q: "How are you securing the Azure OAuth tokens?"**
**A:** "Security was a massive priority since we are holding keys to users' cloud infrastructure. I did not store them in plaintext. I implemented AES-256-GCM encryption using Node's native `crypto` module. The initialization vector (IV) and auth tags are stored alongside the ciphertext, but the decryption key is securely injected via Vercel environment variables. For an enterprise migration, I would move the key to Azure Key Vault (KMS)."

**Q: "If your database goes down, what happens to the users' Azure apps?"**
**A:** "Because CloudGuard acts as an orchestration and monitoring layer, not the hosting provider itself, the blast radius is isolated. If our MongoDB goes down, the auto-shutdown cron job fails to run, but the users' Azure Web Apps remain 100% online and functional. This decoupled state was an intentional architectural choice."

**Q: "Why did you use Vercel Blob instead of streaming the `.zip` file directly through memory to Azure?"**
**A:** "If thousands of students hit deploy at the same time, holding 10MB zip files in Vercel's serverless memory (RAM) while waiting for Azure to provision the servers would cause severe memory exhaustion (`OOM` errors). By offloading the file to Vercel Blob first, we free up RAM instantly and just pass a lightweight URL pointer to the background worker."







