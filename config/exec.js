import 'dotenv/config';

import { bool, cleanEnv, num, str } from 'envalid';

const env = cleanEnv(process.env, {
   EXEC_SANDBOX_MODE: str({ default: 'auto', choices: ['auto', 'docker', 'podman', 'host'] }),
   EXEC_SANDBOX_IMAGE: str({ default: 'debian:bookworm-slim' }),
   EXEC_TIMEOUT: num({ default: 15_000 }),
   EXEC_MAX_OUTPUT: num({ default: 4000 }),
   EXEC_SANDBOX_MEMORY: str({ default: '256m' }),
   EXEC_SANDBOX_CPUS: str({ default: '0.5' }),
   EXEC_SANDBOX_PIDS_LIMIT: num({ default: 64 }),
   EXEC_SANDBOX_NETWORK: bool({ default: false }),
   EXEC_SANDBOX_READONLY: bool({ default: true }),
   EXEC_SANDBOX_USER: str({ default: '65534:65534' }),
});

/** @type {import('#types').ExecConfig} */
export default {
   /** 'auto' | 'docker' | 'podman' | 'host' */
   mode: env.EXEC_SANDBOX_MODE,

   /** Container image for docker/podman modes (must include `bash` + `timeout`). */
   image: env.EXEC_SANDBOX_IMAGE,

   /** Hard limit (ms) for a single command. */
   timeoutMs: env.EXEC_TIMEOUT,

   /** Cap on returned output length (chat-friendly). */
   maxOutput: env.EXEC_MAX_OUTPUT,

   /** Container memory limit (e.g. `256m`). */
   memory: env.EXEC_SANDBOX_MEMORY,

   /** Container CPU quota (e.g. `0.5`). */
   cpus: env.EXEC_SANDBOX_CPUS,

   /** Container PID limit. */
   pidsLimit: env.EXEC_SANDBOX_PIDS_LIMIT,

   /** When false, the container has no network (`--network=none`). */
   network: env.EXEC_SANDBOX_NETWORK,

   /** When true, the container rootfs is read-only (writes only to a tmpfs `/tmp`). */
   readOnly: env.EXEC_SANDBOX_READONLY,

   /** UID:GID the command runs as inside the container. */
   user: env.EXEC_SANDBOX_USER,
};
