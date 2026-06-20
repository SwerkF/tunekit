import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { PLIST_PATH, LAUNCHD_LOG } from "../lib/paths.ts";
import { loadConfig } from "../lib/config.ts";
import { logger } from "../lib/logger.ts";

const LAUNCHD_LABEL = "com.tunekit.sync";

function generatePlist(
  bunPath: string,
  scriptPath: string,
  intervalSeconds: number,
  logPath: string
): string {
  const home = homedir();
  // Inclut ~/.bun/bin dans le PATH pour que bun trouve ses propres ressources
  const bunBinDir = dirname(bunPath);
  const pathEnv = [
    bunBinDir,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i) // dédoublonner
    .join(":");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${bunPath}</string>
    <string>${scriptPath}</string>
    <string>sync</string>
    <string>--quiet</string>
  </array>
  <key>StartInterval</key>
  <integer>${intervalSeconds}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${home}</string>
    <key>PATH</key>
    <string>${pathEnv}</string>
    <key>BUN_INSTALL</key>
    <string>${home}/.bun</string>
  </dict>
</dict>
</plist>
`;
}

async function runLaunchctl(args: string[]): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  const proc = Bun.spawn(["launchctl", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stderr: stderr.trim(), stdout: stdout.trim() };
}

async function findBunPath(): Promise<string> {
  // 1. Chercher via which
  const which = await runLaunchctl(["--version"]); // dummy call replaced below
  const whichProc = Bun.spawn(["which", "bun"], { stdout: "pipe", stderr: "pipe" });
  const whichOut = (await new Response(whichProc.stdout).text()).trim();
  const whichCode = await whichProc.exited;

  if (whichCode === 0 && whichOut) {
    // Résoudre les symlinks pour obtenir le chemin réel
    const realProc = Bun.spawn(["realpath", whichOut], { stdout: "pipe", stderr: "pipe" });
    const realOut = (await new Response(realProc.stdout).text()).trim();
    const realCode = await realProc.exited;
    if (realCode === 0 && realOut) return realOut;
    return whichOut;
  }

  // 2. Chemin bun standard
  const bunDefault = join(homedir(), ".bun", "bin", "bun");
  if (existsSync(bunDefault)) return bunDefault;

  // 3. Fallback : binaire Bun en cours d'exécution
  return process.execPath;
}

async function isAgentLoaded(): Promise<boolean> {
  const { exitCode } = await runLaunchctl(["list", LAUNCHD_LABEL]);
  return exitCode === 0;
}

export async function installDaemon(quiet = false): Promise<void> {
  const log = quiet
    ? (_: string) => {}
    : (msg: string) => process.stdout.write(msg + "\n");

  const config = loadConfig();
  const intervalSeconds = config.syncIntervalMinutes * 60;

  // Chemin absolu vers le script, résolu depuis l'emplacement de ce fichier
  const scriptPath = resolve(
    dirname(new URL(import.meta.url).pathname),
    "..",
    "..",
    "bin",
    "tunekit.ts"
  );

  if (!existsSync(scriptPath)) {
    throw new Error(`Script introuvable : ${scriptPath}\nVérifiez que TuneKit est bien installé dans ce dossier.`);
  }

  const bunPath = await findBunPath();
  log(`  Bun : ${bunPath}`);
  log(`  Script : ${scriptPath}`);

  mkdirSync(dirname(PLIST_PATH), { recursive: true });

  const plistContent = generatePlist(bunPath, scriptPath, intervalSeconds, LAUNCHD_LOG);
  writeFileSync(PLIST_PATH, plistContent);
  log(`  ✓ Plist écrit : ${PLIST_PATH}`);

  // Décharger l'ancien agent s'il est actif (évite les erreurs "already loaded")
  if (await isAgentLoaded()) {
    log("  Déchargement de l'ancien agent...");
    await runLaunchctl(["unload", PLIST_PATH]);
    // Attendre un court instant pour que launchd libère l'agent
    await Bun.sleep(500);
  }

  // Charger avec launchctl load -w (plus fiable que bootstrap sur macOS récent)
  const { exitCode, stderr } = await runLaunchctl(["load", "-w", PLIST_PATH]);

  if (exitCode !== 0) {
    // Essai de validation du plist pour donner un meilleur message
    const validate = Bun.spawn(["plutil", "-lint", PLIST_PATH], { stdout: "pipe", stderr: "pipe" });
    const validateErr = (await new Response(validate.stderr).text()).trim();
    await validate.exited;
    if (validateErr) {
      throw new Error(`Plist invalide : ${validateErr}`);
    }
    throw new Error(`launchctl load a échoué (code ${exitCode}) : ${stderr}`);
  }

  logger.info(`Daemon installé — bun: ${bunPath}, script: ${scriptPath}, intervalle: ${config.syncIntervalMinutes}min`);
  log(`  ✓ Agent launchd démarré (sync toutes les ${config.syncIntervalMinutes} min)`);
}

export async function uninstallDaemon(quiet = false): Promise<void> {
  const log = quiet
    ? (_: string) => {}
    : (msg: string) => process.stdout.write(msg + "\n");

  if (!existsSync(PLIST_PATH)) {
    log("Le daemon n'est pas installé.");
    return;
  }

  if (await isAgentLoaded()) {
    await runLaunchctl(["unload", PLIST_PATH]);
  }

  logger.info("Daemon désinstallé");
  log("  ✓ Agent launchd arrêté et retiré");
}

export async function getDaemonStatus(): Promise<{
  installed: boolean;
  running: boolean;
  pid: number | null;
  lastExitStatus: number | null;
}> {
  if (!existsSync(PLIST_PATH)) {
    return { installed: false, running: false, pid: null, lastExitStatus: null };
  }

  const { exitCode, stdout } = await runLaunchctl(["list", LAUNCHD_LABEL]);

  if (exitCode !== 0) {
    return { installed: true, running: false, pid: null, lastExitStatus: null };
  }

  const pidMatch = stdout.match(/"PID"\s*=\s*(\d+)/);
  const pid = pidMatch ? parseInt(pidMatch[1], 10) : null;

  const exitMatch = stdout.match(/"LastExitStatus"\s*=\s*(\d+)/);
  const lastExitStatus = exitMatch ? parseInt(exitMatch[1], 10) : null;

  return { installed: true, running: pid !== null, pid, lastExitStatus };
}
