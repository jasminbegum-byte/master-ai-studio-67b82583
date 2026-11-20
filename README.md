# Master AI Studio

Build a real, mobile-first Bengali web application named "Master AI Studio" for a solo creator. The user primarily uses an Android phone and prefers Bengali UI. This is the first working foundation of a larger multi-agent AI video production system, NOT a static mockup or a marketing landing page.

Core product goals:
- A polished responsive dashboard in Bengali with a left navigation on desktop and bottom navigation / compact drawer on mobile.
- Main sections: Dashboard, Mini AI Assistant, Script Agent, Character Creator, Animation Engine, Editing Agent, Thumbnail Studio, Production Monitor, Settings.
- Use a clean dark cinematic creator-studio visual style with strong contrast, readable Bengali typography, accessible controls, and responsive layouts.
- Dashboard should show real persisted project/job records when storage is available, recent projects, workflow stages, and clear setup status. Do not invent fake completed jobs or fake progress.
- Build functional forms and state transitions, not inert buttons. Persist user-created project drafts and job metadata using browser-safe local persistence for this first version if no database is provisioned. Do not enable/provision Supabase or any paid service.
- Mini AI Assistant: Bengali chat with local history and a server-side Gemini REST adapter. Configure `GEMINI_API_KEY` as a server-side environment secret; optionally set `GEMINI_MODEL`. Never put credentials in browser code or commit them.
- Script Agent: accepts a Bengali story/idea, saves editable script drafts locally, and can request an AI-generated scene-by-scene draft through the server-side text provider when configured.
- Character Creator: allow character profile creation with name, visual description, clothing, voice notes, and continuity notes; save and reuse character profiles.
- Animation Engine: manual engine selection only (never auto-switch). Options must include "Code Animation" and "Google Flow"; flexible cartoon/visual style. Google Flow external link: https://labs.google/fx/tools/flow . Include an honest note that Flow generation happens on Flow, not inside this app unless a supported integration is later configured. Code Animation should have a working prompt/spec editor and a preview area for future code-rendered animation; do not fake a rendered video.
- Editing Agent: provide Automatic Mode and Prompt Mode as selectable modes. Allow upload/selection of a local video file for review and an editing instruction field. Do not claim to edit/render a video unless a real editing backend is connected. Show connection/setup requirements clearly.
- Thumbnail Studio: allow a user to enter Bengali thumbnail text, choose 9:16 or 16:9, style, and upload a reference video/image. Provide a working prompt builder and save thumbnail briefs. Do not claim to generate an image until an image model is actually connected.
- Production Monitor: real list of locally saved jobs with honest states such as Draft, Waiting for connection, Ready for review, Failed. Provide per-stage status tracking editable by the user; no fabricated live progress. Include a final review/approval checkpoint and explicit approval requirement before any publishing.
- Settings: provider status and data/export controls. The initial text provider can use Gemini API, subject to Google's current account, model, quota and pricing terms. No paid API, external subscription, publishing, or cloud database should be enabled or purchased without the user's explicit permission.
- Provide export of saved project/script/brief data as JSON or downloadable text if practical.
- Use proper empty states, validation, loading/error handling, and Bengali microcopy. The application should remain useful before any external AI provider is connected.
- Do not add automatic Facebook publishing. If publishing is added later, require a separate explicit user confirmation.
- Do not use fake analytics, fake connected badges, fake generation buttons, or demo content presented as real work. Seed only a short clearly labeled example/template if needed and let the user delete it.
- Keep code maintainable and modular so future real integrations can be added safely.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7bf5225a-94aa-4a36-827a-96d686dc556a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
