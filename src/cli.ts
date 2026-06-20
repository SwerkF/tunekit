import { Command } from "commander";
import { render } from "ink";
import { createElement } from "react";
import { App } from "./ui/App.tsx";
import { runInit } from "./commands/init.ts";
import { runSyncCommand } from "./commands/sync.ts";
import { runAddCommand } from "./commands/add.ts";
import {
  installDaemon,
  uninstallDaemon,
  getDaemonStatus,
} from "./commands/daemon.ts";

const program = new Command("tunekit")
  .version("1.0.0")
  .description("Synchronisation de playlists YouTube vers Apple Music");

// No subcommand → launch TUI
program.action(async () => {
  const { waitUntilExit } = render(createElement(App));
  await waitUntilExit();
});

// --- Headless subcommands ---

program
  .command("init")
  .description("Initialise TuneKit (~/.tunekit/, base de données, config)")
  .action(async () => {
    await runInit(false);
  });

program
  .command("sync")
  .description("Synchronise les playlists YouTube")
  .argument("[playlist-id]", "ID de la playlist à synchroniser (optionnel)")
  .option("-q, --quiet", "Mode silencieux — utilisé par launchd")
  .action(async (playlistId: string | undefined, options: { quiet?: boolean }) => {
    await runSyncCommand(playlistId ?? null, options.quiet ?? false);
  });

program
  .command("add")
  .description("Ajoute une playlist YouTube au suivi")
  .argument("<url>", "URL de la playlist YouTube")
  .option("-q, --quiet", "Mode silencieux")
  .action(async (url: string, options: { quiet?: boolean }) => {
    await runAddCommand(url, options.quiet ?? false);
  });

// --- Daemon subcommands ---

const daemon = new Command("daemon").description("Gestion du daemon launchd");

daemon
  .command("install")
  .description("Installe l'agent launchd de synchronisation automatique")
  .action(async () => {
    try {
      await installDaemon(false);
    } catch (err) {
      process.stderr.write(
        `Erreur : ${err instanceof Error ? err.message : String(err)}\n`
      );
      process.exit(1);
    }
  });

daemon
  .command("uninstall")
  .description("Désinstalle l'agent launchd")
  .action(async () => {
    await uninstallDaemon(false);
  });

daemon
  .command("status")
  .description("Affiche le statut du daemon")
  .action(async () => {
    const { installed, running, pid } = await getDaemonStatus();
    if (!installed) {
      process.stdout.write("Daemon non installé.\n");
    } else if (running) {
      process.stdout.write(`Daemon actif (PID ${pid})\n`);
    } else {
      process.stdout.write("Daemon installé mais inactif.\n");
    }
  });

program.addCommand(daemon);

await program.parseAsync(process.argv);
