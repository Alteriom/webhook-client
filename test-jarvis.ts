#!/usr/bin/env ts-node
/**
 * Test script for Jarvis webhook client
 * Tests connection to webhook.alteriom.net using Jarvis API key
 */

import { AlteriomWebhookClient } from './dist/index.js';

// Jarvis credentials (from MEMORY.md)
const JARVIS_API_KEY = 'fc014099527a42b395f349760f74c07f083231d294192f35a3537c5ef256c23c';
const JARVIS_SUBSCRIBER_ID = '0d225333-9b98-407e-a547-9d42af215b47';

async function main() {
  console.log('🧪 Testing Alteriom Webhook Client for Jarvis');
  console.log('==============================================\n');

  // Initialize client
  const client = new AlteriomWebhookClient({
    baseURL: 'https://webhook.alteriom.net',
    apiKey: JARVIS_API_KEY,
    timeout: 30000,
  });

  console.log('✅ Client initialized');
  console.log(`   Base URL: https://webhook.alteriom.net`);
  console.log(`   API Key: ${JARVIS_API_KEY.slice(0, 16)}...`);
  console.log(`   Subscriber ID: ${JARVIS_SUBSCRIBER_ID}\n`);

  try {
    // Test 1: List subscribers
    console.log('📋 Test 1: List subscribers');
    const subscribers = await client.subscribers.list();
    console.log(`   Found ${subscribers.length} subscriber(s)`);
    
    const jarvisSub = subscribers.find(s => s.id === JARVIS_SUBSCRIBER_ID);
    if (jarvisSub) {
      console.log(`   ✅ Jarvis subscription found: ${jarvisSub.name}`);
      console.log(`      URL: ${jarvisSub.url}`);
      console.log(`      Events: ${jarvisSub.events.join(', ')}`);
      console.log(`      Enabled: ${jarvisSub.enabled}`);
    } else {
      console.log('   ⚠️  Jarvis subscription not found');
    }
    console.log();

    // Test 2: List recent events
    console.log('📋 Test 2: List recent events');
    const events = await client.events.list({
      limit: 10,
      event_type: 'workflow_run',
    });
    console.log(`   Found ${events.total} workflow_run events`);
    console.log(`   Showing ${events.data.length} most recent:\n`);
    
    for (const event of events.data.slice(0, 5)) {
      const payload = event.payload as any;
      const repo = payload?.repository?.name || 'unknown';
      const action = payload?.action || 'unknown';
      const conclusion = payload?.workflow_run?.conclusion || 'pending';
      console.log(`   - ${event.event_type}.${action} on ${repo} (${conclusion})`);
      console.log(`     ${new Date(event.received_at).toLocaleString()}`);
    }
    console.log();

    // Test 3: Get aggregates (if any)
    console.log('📋 Test 3: List aggregates');
    const aggregates = await client.aggregates.list({ limit: 5 });
    console.log(`   Found ${aggregates.total} aggregate(s)`);
    
    if (aggregates.data.length > 0) {
      const latest = aggregates.data[0];
      console.log(`   Latest aggregate: ${latest.id}`);
      console.log(`      Events: ${latest.event_count}`);
      console.log(`      Repository: ${latest.repository || 'N/A'}`);
      
      if (latest.enrichment) {
        console.log(`      ✨ Has enrichment!`);
        console.log(`         Risk: ${latest.enrichment.risk_level}`);
        console.log(`         Summary: ${latest.enrichment.summary?.slice(0, 80)}...`);
      }
    }
    console.log();

    console.log('✅ All tests passed!');
    console.log('🎉 Webhook client is working correctly\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
    if (error.details) {
      console.error(`   Details:`, error.details);
    }
    process.exit(1);
  }
}

main().catch(console.error);
