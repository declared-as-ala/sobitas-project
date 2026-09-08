// Preload for the Phase 8 build verification. Fail before any outbound connection is opened.
const net = require('node:net');
// Preserve the asynchronous failure contract. Throwing synchronously from Socket.connect can
// strand Next's prerender accounting and cause a 60-second timeout instead of a settled failure.
net.Socket.prototype.connect = function () {
  queueMicrotask(() => this.destroy(new Error('Phase 8 offline verification: network forbidden')));
  return this;
};
globalThis.fetch = async () => { throw new Error('Phase 8 offline verification: network forbidden'); };

// package.json's cross-env replaces NODE_OPTIONS for `next build`. Carry the blocker through
// that override as well as npm's shell so workers cannot silently regain outbound access.
const childProcess = require('node:child_process');
const preload = `--require="${__filename.replace(/\\/g, '/')}"`;
for (const method of ['spawn', 'spawnSync']) {
  const original = childProcess[method];
  childProcess[method] = function (command, args, options) {
    if (!Array.isArray(args)) { options = args; args = []; }
    const env = { ...process.env, ...options?.env };
    if (!env.NODE_OPTIONS?.includes('product-schema-offline.cjs')) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} ${preload}`.trim();
    }
    return original.call(this, command, args, { ...options, env });
  };
}
