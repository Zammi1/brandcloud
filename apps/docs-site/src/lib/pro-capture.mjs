/** Site-owned adapter for the canonical public capture V2 contract. No provider keys. */
export const captureScope = Object.freeze({
 schemaVersion:2, tenant:'brandcloud', website:'brandcloud-site', campaignId:'brandcloud-pro-launch', campaignVersion:'v1',
 experienceId:'pro-launch-interest', experienceVersion:'v1', placementId:'pro-updates', placementKind:'inline',
 source:'brandcloud-pro', pagePath:'/pro/', consent:true, consentPurpose:'email-marketing', consentWordingVersion:'brandcloud-pro-launch-2026-10-04',
});
export function captureEndpoint(value) {
 try { const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password && !url.search && !url.hash && /^\/v1\/public\/capture\/[a-zA-Z0-9_-]+$/.test(url.pathname) ? url.href : null; } catch { return null; }
}
export function makePayload({email,firstName='',consent,submissionId}) {
 if(consent!==true) throw new Error('Please choose whether you would like the launch email.');
 const clean=String(email??'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)||clean.length>254) throw new Error('Enter a valid email address.');
 const name=String(firstName).trim();if(name.length>80||/[\r\n\t]/.test(name)) throw new Error('Use a first name of up to 80 characters.');
 if(!submissionId||submissionId.length>80) throw new Error('Please reload the page and try again.');
 return {...captureScope,submissionId,email:clean,...(name?{firstName:name}:{})};
}
export async function submitInterest(endpoint,payload,fetcher=fetch) {
 const target=captureEndpoint(endpoint);if(!target) throw new Error('Online sign-up is not available yet. Nothing has been sent.');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try {
  const response=await fetcher(target,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal,credentials:'omit'});
  const body=await response.json().catch(()=>null);
  if(!response.ok||body?.ok!==true||!['accepted','duplicate'].includes(body.status)) throw new Error('We could not confirm your request. Your details are still here. Please try again.');
  return body.status;
 } catch(error) { if(error?.name==='AbortError')throw new Error('We could not confirm your request in time. Try again to check the same request.');throw error; }
 finally{clearTimeout(timer);}
}

export function submissionId(cryptoApi=globalThis.crypto) {
 if(cryptoApi?.randomUUID)return cryptoApi.randomUUID();
 if(!cryptoApi?.getRandomValues)throw new Error("Your browser cannot safely start this request. Please use an up-to-date browser.");
 return "bc-"+Array.from(cryptoApi.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,"0")).join("");
}
