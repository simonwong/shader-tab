// Helpers around the agent-browser CLI (https://agent-browser.dev), shared by the review,
// capture and measurement scripts. Install it once with `npm install -g agent-browser`
// followed by `agent-browser install`; see docs/development.md.
import { execFile, execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const CLI = 'agent-browser';
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 64 * 1024 * 1024;
const execFileAsync = promisify(execFile);

/** Repository root, so scripts work from any working directory. */
export const root = fileURLToPath(new URL('../../', import.meta.url));
/** Resolves a repository-relative path. */
export const fromRoot = (...segments) => resolve(root, ...segments);

/** Creates an empty directory under the OS temp dir (for throwaway Chrome profiles). */
export const tempDir = prefix => mkdtemp(join(tmpdir(), `${prefix}-`));
export const removeDir = path => rm(path, { recursive: true, force: true });

function failure(error) {
  if (error.code === 'ENOENT') {
    return new Error(
      `${CLI} not found. Install it with \`npm install -g ${CLI} && ${CLI} install\` (see docs/development.md).`,
    );
  }
  return error;
}

function parse(stdout) {
  const response = JSON.parse(stdout);
  if (!response.success) throw new Error(JSON.stringify(response.error));
  return response.data;
}

const args = (session, rest) => ['--session', session, '--json', ...rest];

/**
 * Synchronous agent-browser session. `name` is suffixed with the process id so parallel runs
 * do not share a browser.
 */
export function browserSession(name, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const session = `${name}-${process.pid}`;
  const run = (...rest) => {
    let stdout;
    try {
      stdout = execFileSync(CLI, args(session, rest), {
        encoding: 'utf8',
        timeout,
        maxBuffer: MAX_BUFFER,
      });
    } catch (error) {
      throw failure(error);
    }
    return parse(stdout);
  };
  const evaluate = code => run('eval', code).result;
  return {
    session,
    run,
    evaluate,
    /** Waits until a page expression is truthy. */
    waitFor: code => run('wait', '--fn', code),
    /** Waits inside the page, keeping the page's timers in step. */
    sleep: ms => evaluate(`new Promise(r=>setTimeout(r,${ms}))`),
    screenshot: path => run('screenshot', path),
    errors: () => run('errors').errors,
    /** Closes the browser; never throws, so it is safe in `finally`. */
    close: () => {
      try {
        run('close');
      } catch {
        // Already closed or never opened.
      }
    },
  };
}

/**
 * Asynchronous variant for scripts that serve fixtures from an in-process HTTP server,
 * which a blocking call would starve.
 */
export function browserSessionAsync(name, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const session = `${name}-${process.pid}`;
  const run = async (...rest) => {
    try {
      const { stdout } = await execFileAsync(CLI, args(session, rest), {
        encoding: 'utf8',
        timeout,
        maxBuffer: MAX_BUFFER,
      });
      return parse(stdout);
    } catch (error) {
      throw failure(error);
    }
  };
  const evaluate = async code => (await run('eval', code)).result;
  return {
    session,
    run,
    evaluate,
    waitFor: code => run('wait', '--fn', code),
    sleep: ms => evaluate(`new Promise(r=>setTimeout(r,${ms}))`),
    screenshot: path => run('screenshot', path),
    errors: async () => (await run('errors')).errors,
    close: () => run('close').catch(() => {}),
  };
}
