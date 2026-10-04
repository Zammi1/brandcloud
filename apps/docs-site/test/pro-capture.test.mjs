import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePayload, submitInterest, captureEndpoint, submissionId } from '../src/lib/pro-capture.mjs';
const input = { email: ' person@example.test ', firstName: ' Pat ', consent: true, submissionId: 'test-1' };
test('requires explicit consent and validates endpoint', () => {
 assert.throws(() => makePayload({...input, consent:false}));
 assert.equal(captureEndpoint('http://api.example.test/v1/public/capture/key'), null);
 assert.equal(captureEndpoint('https://api.example.test/wrong'), null);
});
test('published scope and same request ID survive retry without bundled consent', async () => {
 const payload=makePayload(input);const calls=[];
 const fetcher=async (url, options)=>{calls.push(JSON.parse(options.body));return new Response(JSON.stringify({ok:true,status:'duplicate'}),{status:200});};
 await submitInterest('https://api.example.test/v1/public/capture/key',payload,fetcher);
 await submitInterest('https://api.example.test/v1/public/capture/key',payload,fetcher);
 assert.deepEqual(calls[0],calls[1]);assert.equal(payload.email,'person@example.test');assert.equal(payload.consentPurpose,'email-marketing');
 assert.equal(payload.campaignId,'brandcloud-pro-launch');
});
test('HTTP success alone is not accepted; failures stay recoverable',async()=>{
 const payload=makePayload(input);
 await assert.rejects(submitInterest('https://api.example.test/v1/public/capture/key',payload,async()=>new Response('{}')));
 await assert.rejects(submitInterest('https://api.example.test/v1/public/capture/key',payload,async()=>new Response('',{status:503})));
});

test("private HTTP preview uses crypto fallback without Math.random",()=>{assert.match(submissionId({getRandomValues:array=>array.fill(42)}),/^bc-(2a){16}$/);assert.throws(()=>submissionId({}));});
