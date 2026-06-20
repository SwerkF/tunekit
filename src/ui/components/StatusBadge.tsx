import { Text } from "ink";
import { TrackStatus } from "../../types/track-status.ts";
import { SyncRunStatus } from "../../types/sync-run-status.ts";
import { useT } from "../../lib/i18n.tsx";

interface TrackStatusBadgeProps {
  status: string;
}

export function TrackStatusBadge({ status }: TrackStatusBadgeProps) {
  const t = useT();
  switch (status as TrackStatus) {
    case TrackStatus.Downloaded:
      return <Text color="green">{t("statusDownloaded")}</Text>;
    case TrackStatus.Downloading:
      return <Text color="cyan">{t("statusDownloading")}</Text>;
    case TrackStatus.Failed:
      return <Text color="red">{t("statusFailed")}</Text>;
    case TrackStatus.Pending:
      return <Text color="gray">{t("statusPending")}</Text>;
    default: {
      const _exhaustive: never = status as never;
      void _exhaustive;
      return <Text color="gray">{status}</Text>;
    }
  }
}

interface SyncStatusBadgeProps {
  status: string;
}

export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  const t = useT();
  switch (status as SyncRunStatus) {
    case SyncRunStatus.Success:
      return <Text color="green">{t("syncStatusSuccess")}</Text>;
    case SyncRunStatus.Partial:
      return <Text color="yellow">{t("syncStatusPartial")}</Text>;
    case SyncRunStatus.Failed:
      return <Text color="red">{t("syncStatusFailed")}</Text>;
    case SyncRunStatus.Running:
      return <Text color="cyan">{t("syncStatusRunning")}</Text>;
    default: {
      const _exhaustive: never = status as never;
      void _exhaustive;
      return <Text color="gray">{status}</Text>;
    }
  }
}
