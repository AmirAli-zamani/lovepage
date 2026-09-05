// Start Firefox with --headless --remote-debugging-port 9222 and a temporary profile.
// Uses Node 22's built-in WebSocket; no test dependencies.
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const socket = new WebSocket('ws://127.0.0.1:9222/session');
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0;
const pending = new Map();
socket.onmessage = ({data}) => {
  const message = JSON.parse(data);
  if (!pending.has(message.id)) return;
  const {resolve, reject} = pending.get(message.id);
  pending.delete(message.id);
  if (message.type === 'error') reject(new Error(JSON.stringify(message)));
  else resolve(message.result);
};
const call = (method, params) => new Promise((resolve, reject) => {
  pending.set(++id, {resolve, reject});
  socket.send(JSON.stringify({id, method, params}));
});
try {
  await call('session.end', {}).catch(() => {});
  await call('session.new', {capabilities: {}});
  const {context} = await call('browsingContext.create', {type: 'tab'});
  const evaluate = async expression => {
    const result = await call('script.evaluate', {expression, target: {context}, awaitPromise: true});
    if (result.type === 'exception') throw new Error(JSON.stringify(result));
    return result.result.value;
  };
  const navigate = () => call('browsingContext.navigate', {context, url: 'http://127.0.0.1:8000/', wait: 'complete'});
  mkdirSync('.artifacts', {recursive: true});
  for (const width of [320, 390, 768, 1440]) {
    await call('browsingContext.setViewport', {context, viewport: {width, height: 900}, devicePixelRatio: 1});
    await navigate();
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow at ${width}`);
    assert.equal(await evaluate('document.querySelectorAll(".chapter").length'), 5);
    const shot = await call('browsingContext.captureScreenshot', {context});
    writeFileSync(`.artifacts/firefox-${width}.png`, Buffer.from(shot.data, 'base64'));
  }
  await evaluate('document.querySelector(".begin-button").click()');
  await new Promise(resolve => setTimeout(resolve, 1900));
  assert.equal(await evaluate('location.hash'), '#beginning');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#title-beginning")).opacity'), '1');
  await evaluate('document.querySelector(".motion-toggle").click()');
  assert.equal(await evaluate('document.body.classList.contains("motion-paused")'), true);
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#title-always")).opacity'), '1');
  await evaluate('[...document.querySelectorAll(".chapter-rail a")].find(a => a.hash === "#life-happened").click()');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await evaluate('document.querySelector(".chapter-rail [aria-current]").hash'), '#life-happened');
  const shot = await call('browsingContext.captureScreenshot', {context});
  writeFileSync('.artifacts/firefox-night.png', Buffer.from(shot.data, 'base64'));
  console.log('Passed: 320/390/768/1440 widths without overflow; 5 chapters; start link; text reveal; motion pause; active chapter tracking.');
  await call('browsingContext.close', {context});
  await call('session.end', {});
} finally { socket.close(); }
