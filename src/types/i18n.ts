export type Locale = "en" | "fr";

export interface Translations {
  // --- Screen titles ---
  screenDashboard: string;
  screenPlaylists: string;
  screenAdd: string;
  screenSync: string;
  screenSettings: string;
  screenDaemon: string;
  screenLogs: string;
  screenLanguageSetup: string;

  // --- Language setup ---
  langSetupWelcome: string;
  langSetupSubtitle: string;
  langEnglish: string;
  langFrench: string;

  // --- Footer shortcuts ---
  footerNavigate: string;
  footerSelect: string;
  footerBack: string;
  footerQuit: string;
  footerOpen: string;
  footerCancel: string;
  footerConfirm: string;
  footerDetails: string;
  footerViewLogs: string;
  footerScroll: string;
  footerFilterErrors: string;
  footerFilterWarnings: string;
  footerRefresh: string;

  // --- Dashboard ---
  dashPlaylists: string;
  dashTracks: string;
  dashErrors: string;
  dashLastSync: string;
  dashDaemon: string;
  dashDaemonActive: string;
  dashDaemonInactive: string;
  dashMenuPlaylists: string;
  dashMenuAdd: string;
  dashMenuSync: string;
  dashMenuSettings: string;
  dashMenuDaemon: string;
  dashMenuLogs: string;
  dashTimeNever: string;
  dashTimeJustNow: string;
  dashTimeMinutesAgo: string;
  dashTimeHoursAgo: string;
  dashTimeDaysAgo: string;

  // --- Playlists screen ---
  playlistsEmpty: string;
  playlistsEmptyPress: string;
  playlistsEmptyHint: string;
  playlistsSync: string;
  playlistsDelete: string;
  playlistsBackToList: string;
  playlistsConfirmTitle: string;
  playlistsConfirmNote: string;
  playlistsConfirmYes: string;
  playlistsConfirmNo: string;
  playlistsUrl: string;

  // --- Add playlist screen ---
  addInstructions: string;
  addEnterKey: string;
  addUrlLabel: string;
  addLoading: string;
  addSuccess: string;
  addSuccessHint: string;
  addErrorTitle: string;
  addErrorHint: string;
  addInvalidUrl: string;

  // --- Sync progress screen ---
  syncDone: string;
  syncAdded: string;
  syncFailed: string;
  syncFailedTitle: string;
  syncMoreFailures: string;
  syncPlaylistLabel: string;
  syncDownloading: string;
  syncPreparing: string;
  syncTracksProcessed: string;
  syncAdding: string;
  syncErrors: string;
  syncLastErrors: string;

  // --- Settings screen ---
  settingsIntervalLabel: string;
  settingsFolderLabel: string;
  settingsFolderAuto: string;
  settingsReapplyDaemon: string;
  settingsLanguageLabel: string;
  settingsBack: string;
  settingsUpdatingDaemon: string;
  settingsIntervalTitle: string;
  settingsIntervalField: string;
  settingsFolderTitle: string;
  settingsFolderHint: string;
  settingsFolderField: string;
  settingsIntervalInvalid: string;
  settingsIntervalUpdated: string;
  settingsFolderUpdated: string;
  settingsFolderReset: string;
  settingsDaemonUpdated: string;

  // --- Daemon screen ---
  daemonStatus: string;
  daemonLoading: string;
  daemonActive: string;
  daemonInstalledInactive: string;
  daemonNotInstalled: string;
  daemonInterval: string;
  daemonLastExit: string;
  daemonPlist: string;
  daemonReinstall: string;
  daemonUninstall: string;
  daemonRefresh: string;
  daemonBack: string;
  daemonInstall: string;
  daemonInstalling: string;
  daemonUninstalling: string;
  daemonInstalledMsg: string;
  daemonUninstalledMsg: string;

  // --- Logs screen ---
  logsNoFile: string;
  logsNoFileHint: string;
  logsFilterLabel: string;
  logsFilterAll: string;
  logsFilterErrors: string;
  logsFilterWarnings: string;
  logsNoEntries: string;
  logsNoEntriesLevel: string;

  // --- Status badges ---
  statusDownloaded: string;
  statusDownloading: string;
  statusFailed: string;
  statusPending: string;
  syncStatusSuccess: string;
  syncStatusPartial: string;
  syncStatusFailed: string;
  syncStatusRunning: string;

  // --- Generic ---
  errorLabel: string;
}
