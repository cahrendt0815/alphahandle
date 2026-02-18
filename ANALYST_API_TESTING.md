# Testing the Data Analyst API

Your analyst’s API endpoint and expected request/response format are described below, plus how to test it from the app and from the command line.

---

## Quick: How to test the API with your app

1. **Analyst API only (no app)**  
   - `curl "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?month=6"`  
   - Confirms the analyst returns a JSON array.

   **→ Step-by-step for non-technical users:** see [Option A – Simple steps](#option-a--test-the-analyst-api-only-simple-steps) below.

2. **Your backend locally (recommended)**  
   - In project root: `.env` with `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL=https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query`  
   - Run: `npm run server`  
   - Then either:
     - **From the app:** Point the app at `http://localhost:3000` (or use your dev build’s API base) and run a handle search, or  
     - **From terminal:**  
       `curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"handle":"@rubicon59","months":36}'`  
   - You should get JSON with `trades` and `stats`. Any error will show in the terminal.

3. **Live app (production)**  
   - Ensure Vercel has env: `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL` = that same analyst URL.  
   - Deploy, then in the app: sign in → enter handle (e.g. `rubicon59`) → run analysis.  
   - If you get **500**: open **Vercel → Project → Logs** (or **Deployments → latest → Functions → api/analyze → Logs**) and look for `[Analyze]` lines or the exception. The app will show the backend `message` in the error state when the backend returns JSON with `error`/`message`.

---

## Option A – Test the analyst API only (simple steps)

This checks that the **data source** your app uses is working—without opening the app. You’re just asking that service: “Give me data for the last 6 months.” If you get a list of items back, the source is fine.

**What you need:** A Mac or Windows PC. No coding.

### On a Mac

1. **Open the Terminal**
   - Press **Cmd + Space** to open Spotlight (the search bar).
   - Type **Terminal** and press **Enter**.
   - A window with a black or white background and text will open.

2. **Run the test command**
   - Click in that window so your typing goes there.
   - Copy this **entire** line (including the quotes):
     ```
     curl "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?month=6"
     ```
   - Paste it into the Terminal (Cmd + V).
   - Press **Enter**.

3. **What you should see**
   - **If it works:** A long block of text appears (often starting with `[` and containing things like `"id"`, `"url"`, `"created_at"`). That’s the data list. No need to understand it—seeing that block means the analyst API is responding.
   - **If something’s wrong:** You might see an error message (e.g. “Could not resolve host” or “Connection refused”). In that case the data source isn’t reachable from your network.

### On Windows (PowerShell)

1. **Open PowerShell**
   - Press the **Windows key**, type **PowerShell**, click **Windows PowerShell**.

2. **Run the test command**
   - Copy this **entire** line (including the quotes):
     ```
     curl "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?month=6"
     ```
   - Paste into PowerShell (right-click or Ctrl + V), then press **Enter**.

3. **What you should see**
   - Same as on Mac: a long block of text (data list) = working; an error message = problem reaching the data source.

### What this tells you

- **You saw the long data block** → The analyst API is up and returning data. If your app still fails, the issue is likely in your app or in how your app talks to this API.
- **You saw an error** → The data source isn’t reachable (e.g. network, firewall, or the service is down). Fix that first before debugging the app.

---

## 1. Analyst API details

- **Endpoint:** `https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query`
- **Method:** `GET`
- **Parameters:** For now only **`month`** (singular) is valid; it filters by tweet posted time. Other params (e.g. `account`, `index`, `sort_by`) may be added later.
- **Response:** A JSON **array** of tweet objects. Each item looks like:

```json
{
  "id": 2000856993926668547,
  "url": "https://x.com/rubicon59/status/2000856993926668547",
  "created_at": "2025-12-16",
  "cashtag": ["$NXSN", "$ATH"],
  "text": "When you sit by the river long enough...",
  "begin": 0,
  "return": 0,
  "last": 0,
  "alpha": 0
}
```

(`begin`, `return`, `last`, `alpha` are currently always 0; they’ll be filled when the analyst adds price/return logic.)

---

## 2. Test the analyst API directly (Postman / curl)

### Option A: Postman (or similar)

1. **Method:** `GET`
2. **URL:** `https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query`
3. **Params (query or body):**  
   - If the API expects **query parameters:**  
     - Add: `month` = `6` (or `12`, `36`).
   - If it expects a **JSON body** (as in your screenshot):  
     - Body → raw → JSON:  
     ```json
     {
       "month": 6
     }
     ```
4. Send the request. You should get a JSON **array** of tweet objects (possibly empty if no data for that month).

### Option B: curl (query params)

```bash
curl -s "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?month=6"
```

### Option C: curl (GET with JSON body – if required)

Some APIs use GET + body; curl can do that:

```bash
curl -s -X GET "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query" \
  -H "Content-Type: application/json" \
  -d '{"month": 6}'
```

Use whichever format your analyst confirms (query vs body).

---

## 3. Test via our app (through our backend)

Our app does **not** call the analyst API from the browser. It calls **our** backend, which then calls the analyst API.

1. **Set the analyst API URL in Vercel**
   - Vercel project → Settings → Environment Variables
   - Add:  
     - Name: `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL`  
     - Value: `https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query`  
   - Redeploy so the serverless function gets the new value.

2. **Use the app**
   - Open your deployed app (e.g. `https://your-app.vercel.app`).
   - Sign in, go to the Handle Analyzer (portal).
   - Enter a handle (e.g. `@rubicon59`) and run analysis.
   - The app sends a **POST** to our backend `/api/analyze` with `{ handle, months }`. Our backend:
     - Calls the analyst API with **`month`** (singular) and optional **`account`**/handle when supported.
     - Converts the analyst’s array into the shape the app expects: `{ trades, stats }`, with each item mapped to our trade format (ticker from `cashtag`, date from `created_at`, return from `return`, etc.).

3. **Check Vercel logs**
   - Vercel → your project → Logs (or Functions → `api/analyze` → Logs).
   - You should see lines like:
     - `[Analyze] Forwarding request to analyst API: https://...?month=6`
     - `[Analyze] Successfully received response from analyst API`
     - `[Analyze] Response type: array`
   - If you see 4xx/5xx or “Invalid response format”, the logs will help debug.

---

## 4. Test our backend locally (optional)

1. **Env**
   - In project root, `.env` (or `.env.local`):
     - `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL=https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query`

2. **Start backend**
   - `npm run server`
   - Backend runs at `http://localhost:3000`.

3. **Call our analyze endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"handle":"@rubicon59","months":6}'
   ```
   You should get JSON with `trades` (array) and `stats` (object). Trades will be in our app’s format (ticker, dateMentioned, stockReturn, tweetUrl, etc.).

---

## 5. Summary

| Step | Where | What to do |
|------|--------|------------|
| 1 | Postman/curl | Call analyst API directly with `month=6` (query or body as specified). |
| 2 | Vercel env | Set `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL` to the analyst’s `/query` URL. |
| 3 | Deployed app | Run a handle analysis and confirm results and Vercel logs. |
| 4 | (Optional) | Run `npm run server` and `curl` our `/api/analyze` to test the proxy and mapping. |

Once the analyst enables more parameters (e.g. `account`/handle), we can pass the handle from the app through the backend into those fields.
