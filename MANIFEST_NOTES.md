# AlertMe JARVIS Manifest Notes

- `permissions`: 
  - `tabs` – used to open monitoring tabs.
  - `storage` – stores user preferences locally.
  - `alarms` – schedules periodic checks.
  - `notifications` – shows alerts on ticket changes.
  - `scripting` – injects scripts to read ticket counts.
  - `power` – requests keep-awake mode if enabled.

- `host_permissions`:
  - `*://*.mendixcloud.com/*` – allows monitoring any URL on Mendix Cloud; no company-specific data in manifest.

- `web_accessible_resources`:
  - Allows local alert HTML and sound files to be opened in popup windows.
  - Restricted to Mendix Cloud URLs only.

- Notes for InfoSec:
  - No sensitive URLs are hardcoded.
  - User must supply their monitoring URL.
  - Sounds and alert HTML are local files, no external network requests.
