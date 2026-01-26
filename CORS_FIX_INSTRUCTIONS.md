# CORS Error - How to Fix

## The Problem

You're seeing this error:
```
Access to fetch at 'https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query' 
from origin 'http://localhost:8081' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This happens because the API endpoint doesn't allow requests from your browser's origin (`http://localhost:8081`).

## Solutions

### Solution 1: Ask Your Data Analyst to Enable CORS (Recommended)

Your data analyst needs to configure CORS on the AWS API Gateway endpoint. Here's what they need to do:

#### For AWS API Gateway:

1. **Go to API Gateway Console** → Select your API → Select the resource/method
2. **Enable CORS:**
   - Click "Actions" → "Enable CORS"
   - Configure CORS settings:
     - **Access-Control-Allow-Origin**: `*` (for all origins) or specific origins like `http://localhost:8081,https://yourdomain.com`
     - **Access-Control-Allow-Methods**: `GET, POST, OPTIONS`
     - **Access-Control-Allow-Headers**: `Content-Type, Authorization, X-API-Key`
     - **Access-Control-Max-Age**: `86400` (24 hours)
3. **Deploy the API** after enabling CORS

#### For AWS Lambda (if using Lambda directly):

Add CORS headers in the Lambda function response:

```python
# Python example
def lambda_handler(event, context):
    response = {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',  # Or specific origin
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        },
        'body': json.dumps(your_data)
    }
    return response
```

```javascript
// Node.js example
exports.handler = async (event) => {
    const response = {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',  // Or specific origin
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        },
        body: JSON.stringify(yourData)
    };
    return response;
};
```

### Solution 2: Test Using Command Line (No CORS Issues)

The command line script doesn't have CORS restrictions:

```bash
npm run test:stock-api "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query" @rubicon59 --months=6
```

Or using curl:

```bash
curl "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?handle=rubicon59&months=6"
```

### Solution 3: Use a CORS Proxy (Development Only)

For testing purposes, you can use a CORS proxy. **Note: Only use this for development, never in production!**

Update the test screen to use a proxy:

```javascript
// Development only - add proxy prefix
const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const url = new URL(`${proxyUrl}${endpointUrl}`);
```

Or use a local proxy server.

### Solution 4: Test from Postman/Insomnia

API testing tools like Postman or Insomnia don't have CORS restrictions:

1. Open Postman/Insomnia
2. Create a new GET request
3. Enter: `https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?handle=rubicon59&months=6`
4. Send the request

## What to Tell Your Data Analyst

Send them this message:

> Hi! I'm testing the API endpoint and getting a CORS error. The endpoint needs to allow requests from my development origin (`http://localhost:8081`) and production origin (`https://yourdomain.com`).
>
> Could you please enable CORS on the API Gateway endpoint with these settings:
> - Access-Control-Allow-Origin: `*` (or specific origins)
> - Access-Control-Allow-Methods: `GET, POST, OPTIONS`
> - Access-Control-Allow-Headers: `Content-Type, Authorization, X-API-Key`
>
> The endpoint URL is: `https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query`
>
> Once CORS is enabled, I'll be able to test it from the browser. Thanks!

## Quick Test Commands

```bash
# Test with curl (no CORS issues)
curl "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?handle=rubicon59&months=6"

# Test with curl and pretty print
curl "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query?handle=rubicon59&months=6" | jq

# Test with the Node.js script
npm run test:stock-api "https://s4pfj1jmmd.execute-api.eu-central-1.amazonaws.com/query" @rubicon59 --months=6
```

## Security Note

For production, **don't use `Access-Control-Allow-Origin: *`**. Instead, specify your exact production domain:

```
Access-Control-Allow-Origin: https://yourdomain.com
```

This prevents other websites from making requests to your API.
