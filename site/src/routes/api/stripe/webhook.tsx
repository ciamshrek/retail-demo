import { defineEventHandler, toWebRequest } from "@tanstack/react-start/server";
import { appRouter } from '~/server/trpc/root';
import { createTRPCContext } from '~/server/trpc/context';

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  
  if (!request || request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  try {
    const payload = await request.text();
    
    // Create tRPC context and caller
    const context = await createTRPCContext(request);
    const caller = appRouter.createCaller(context);
    
    await caller.handleWebhook({
      payload,
      signature,
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      { status: 400 }
    );
  }
});
