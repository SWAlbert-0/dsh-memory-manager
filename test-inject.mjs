// Unit-test the pre-step memory injection without a model call.
import { apply } from './lib/index.js';

const handlers = {};
const ctx = {
  logger: { info() {} },
  tools: { register() {} },
  connection: { fetch: { register() {} } },
  on(event, fn) { handlers[event] = fn; },
  effect(fn) { fn(); },
};

apply(ctx);
const preStep = handlers['agent/pre-step'];
if (!preStep) throw new Error('pre-step handler not registered');

const base = [{ role: 'user', content: [{ type: 'text', text: '帮我订去东京的机票' }], id: 'u1' }];
const decision = await preStep({}, async () => ({ kind: 'ok', messages: base }));
const injected = decision.messages.find((m) => m.role === 'user' && m.content?.some((c) => c.text?.includes('<memory-context>')));
console.log('messages before:', base.length, 'after:', decision.messages.length);
console.log('injected:', Boolean(injected));
console.log('contains vegetarian memory:', Boolean(injected?.content?.[0]?.text?.includes('素食')));
console.log('--- injected text ---');
console.log(injected?.content?.[0]?.text);

// second call must not duplicate
const second = await preStep({}, async () => ({ kind: 'ok', messages: decision.messages }));
console.log('duplicate on second call:', second.messages.length - decision.messages.length);
