// app/api/webhook/stripe/route.ts
//
// Stripe webhook receiver. This is a TEMPLATE — to make it live you'll need to:
//   1. `npm install stripe`
//   2. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your env (.env.local / Vercel)
//   3. Uncomment the `stripe` import block below and replace the placeholder code
//   4. Add a Stripe webhook in your Stripe Dashboard pointing to
//      https://your-app.vercel.app/api/webhook/stripe with event:
//      `checkout.session.completed`
//
// The handler verifies the webhook signature, extracts the user_id from
// `metadata.user_id` set when the Checkout Session was created, and flips
// `profiles.is_pro = true` in Supabase.

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs"; // Stripe SDK needs Node, not edge

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!secret || !stripeKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." },
      { status: 503 }
    );
  }

  // ─── Live implementation (uncomment when stripe is installed) ───
  //
  // import Stripe from "stripe";
  // const stripe = new Stripe(stripeKey);
  // const sig = req.headers.get("stripe-signature");
  // if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  //
  // const rawBody = await req.text();
  // let event: Stripe.Event;
  // try {
  //   event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  // } catch (err) {
  //   return NextResponse.json({ error: `Webhook verification failed: ${err}` }, { status: 400 });
  // }
  //
  // if (event.type === "checkout.session.completed") {
  //   const session = event.data.object as Stripe.Checkout.Session;
  //   const userId = session.metadata?.user_id;
  //   if (userId) {
  //     const sb = getSupabase();
  //     if (sb) {
  //       await sb.from("profiles").update({ is_pro: true }).eq("id", userId);
  //     }
  //   }
  // }
  // return NextResponse.json({ received: true });

  // ─── Stub (current) ───
  // Read body so we don't hold the connection open, but otherwise no-op.
  await req.text().catch(() => "");
  void getSupabase;
  return NextResponse.json({
    received: true,
    note: "Stripe webhook stub — see app/api/webhook/stripe/route.ts to enable.",
  });
}
