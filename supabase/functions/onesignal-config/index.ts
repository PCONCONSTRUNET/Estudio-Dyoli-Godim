// Returns public OneSignal config (App ID) for the frontend SDK init.
// App ID is public — safe to expose. REST API Key stays server-side.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";

  return new Response(
    JSON.stringify({ appId }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
