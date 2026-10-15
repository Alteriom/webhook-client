/**
 * socket.io-client is an optional peer dependency: the package root must load
 * without it, and only WebSocketClient#connect() may need it.
 * @jest-environment node
 */

import { spawnSync } from 'child_process';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..');

/**
 * Loads src/index in a plain Node process (outside jest's module registry, and
 * outside coverage) where resolving socket.io-client fails as it does for a
 * consumer that did not install the optional peer.
 */
const loadRootWithoutPeer = `
const Module = require('module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'socket.io-client' || request.startsWith('socket.io-client/')) {
    const err = new Error("Cannot find module '" + request + "'");
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return resolve.call(this, request, ...rest);
};
require('ts-node/register/transpile-only');
const root = require('./src/index');
const exported = ['AlteriomWebhookClient', 'webhookReceiver', 'expressReceiver', 'WebSocketClient'];
console.log(exported.map((name) => name + ':' + typeof root[name]).join(' '));
`;

function missingModule(name: string): never {
  const err = new Error(`Cannot find module '${name}'`) as Error & { code?: string };
  err.code = 'MODULE_NOT_FOUND';
  throw err;
}

describe('without socket.io-client installed', () => {
  it('the package root loads the REST client, the receiver and the adapters', () => {
    const run = spawnSync(process.execPath, ['-e', loadRootWithoutPeer], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000,
    });

    expect(run.stderr).not.toContain('socket.io-client');
    expect(run.status).toBe(0);
    expect(run.stdout.trim()).toBe(
      'AlteriomWebhookClient:function webhookReceiver:function expressReceiver:function WebSocketClient:function'
    );
  }, 30000);

  describe('WebSocketClient', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('socket.io-client', () => missingModule('socket.io-client'));
    });

    afterEach(() => {
      jest.dontMock('socket.io-client');
    });

    it('fails only on connect(), with an error that names the missing peer', async () => {
      const { WebSocketClient } = await import('../src/ws-client');
      const ws = new WebSocketClient({ url: 'https://ws.example.com', apiKey: 'test-api-key' });

      expect(() => ws.connect()).toThrow(/npm install socket\.io-client/);
      expect(ws.connected).toBe(false);
    });
  });
});
