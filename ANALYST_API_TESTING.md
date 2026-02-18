# Testing the Data Analyst API

Your analyst’s API endpoint and expected request/response format are described below, plus how to test it from the app and from the command line.

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
