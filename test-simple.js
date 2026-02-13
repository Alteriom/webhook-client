#!/usr/bin/env node
/**
 * Simple test using raw fetch to verify Jarvis webhook credentials
 */

const JARVIS_API_KEY = 'fc014099527a42b395f349760f74c07f083231d294192f35a3537c5ef256c23c';
const JARVIS_SUBSCRIBER_ID = 'f57063a7-1fb4-44f8-98fc-58396db662bb';
const BASE_URL = 'https://webhook.alteriom.net';

async function test() {
  console.log('🧪 Testing Jarvis Webhook API Access\n');

  try {
    // Test 1: List subscribers
    console.log('📋 Test 1: GET /api/subscribers');
    const subsRes = await fetch(`${BASE_URL}/api/subscribers`, {
      headers: { 'Authorization': `Bearer ${JARVIS_API_KEY}` }
    });
    const subs = await subsRes.json();
    console.log(`   Status: ${subsRes.status}`);
    console.log(`   Found ${subs.length} subscribers`);
    
    const jarvisSub = subs.find(s => s.id === JARVIS_SUBSCRIBER_ID);
    if (jarvisSub) {
      console.log(`   ✅ Jarvis found: ${jarvisSub.name}`);
      console.log(`      Events: ${jarvisSub.events.join(', ')}`);
    } else {
      console.log('   ⚠️  Jarvis subscriber not found');
      console.log(`      Available IDs: ${subs.map(s => `${s.name}(${s.id.slice(0,8)})`).join(', ')}`);
    }
    console.log();

    // Test 2: List events
    console.log('📋 Test 2: GET /api/events?limit=5');
    const eventsRes = await fetch(`${BASE_URL}/api/events?limit=5`, {
      headers: { 'Authorization': `Bearer ${JARVIS_API_KEY}` }
    });
    const eventsData = await eventsRes.json();
    console.log(`   Status: ${eventsRes.status}`);
    console.log(`   Total events: ${eventsData.total}`);
    console.log(`   Showing ${eventsData.events.length} most recent:\n`);
    
    for (const event of eventsData.events) {
      const repo = event.repository || 'unknown';
      const action = event.action || 'unknown';
      console.log(`   - ${event.event_type}.${action} on ${repo}`);
      console.log(`     ${new Date(event.received_at).toLocaleString()}`);
    }
    console.log();

    // Test 3: List aggregates
    console.log('📋 Test 3: GET /api/aggregates?limit=3');
    const aggsRes = await fetch(`${BASE_URL}/api/aggregates?limit=3`, {
      headers: { 'Authorization': `Bearer ${JARVIS_API_KEY}` }
    });
    const aggsData = await aggsRes.json();
    console.log(`   Status: ${aggsRes.status}`);
    console.log(`   Total: ${aggsData.total}`);
    console.log(`   Recent aggregates:\n`);
    
    for (const agg of aggsData.aggregates || []) {
      console.log(`   - ${agg.id.slice(0, 8)}... (${agg.event_count} events)`);
      console.log(`     Repo: ${agg.repository || 'N/A'}`);
      if (agg.enrichment) {
        console.log(`     ✨ Enriched: ${agg.enrichment.risk_level} risk`);
      }
    }
    console.log();

    console.log('✅ All tests passed!');
    console.log('🎉 Jarvis API credentials working\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
