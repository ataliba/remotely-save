import { requestUrl } from "obsidian";
import type { RemoteLockConfig } from "./baseTypes";

export const DEFAULT_REMOTE_LOCK_CONFIG: RemoteLockConfig = {
  enabled: false,
  baseUrl: "",
  username: "",
  password: "",
  lockFilePath: "",
};

/**
 * Reads a small JSON file (e.g. {"locked": 0}) over WebDAV before syncing.
 * This plugin only ever GETs this file — it's written by the external
 * process (pipeline/sync container) that this lock protects against.
 *
 * Fails open (returns false / "not locked") on any network, status, or
 * parsing error, so a misconfigured or unreachable lock file never blocks
 * normal sync — it can only skip a run when it positively confirms
 * locked != 0.
 */
export async function isRemoteLocked(
  cfg: RemoteLockConfig | undefined
): Promise<boolean> {
  if (!cfg?.enabled || !cfg.baseUrl || !cfg.lockFilePath) {
    return false;
  }

  const base = cfg.baseUrl.replace(/\/$/, "");
  const path = cfg.lockFilePath.startsWith("/")
    ? cfg.lockFilePath
    : `/${cfg.lockFilePath}`;
  const url = `${base}${path}`;
  const auth = btoa(`${cfg.username}:${cfg.password}`);

  try {
    const res = await requestUrl({
      url,
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      throw: false,
    });

    if (res.status !== 200) {
      // 404 = arquivo ainda não existe (ex: pipeline nunca rodou) — trata
      // como destravado, não como erro.
      if (res.status !== 404) {
        console.warn(
          `remoteLock: GET retornou status=${res.status}, seguindo sem travar`
        );
      }
      return false;
    }

    const data = JSON.parse(res.text);
    const n = Number(data?.locked);
    return !Number.isNaN(n) && n !== 0;
  } catch (e) {
    console.warn(`remoteLock: check falhou (${e}), seguindo sem travar`);
    return false;
  }
}
