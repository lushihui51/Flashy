import { TriangleAlert, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from 'src/components/shell/useConnectionStatus';

const BANNER = {
  offline: { Icon: WifiOff, text: "You're offline. Flashy will reconnect automatically." },
  unreachable: {
    Icon: WifiOff,
    text: "Can't reach Flashy. Check your connection; retrying automatically.",
  },
  server_trouble: {
    Icon: TriangleAlert,
    text: 'Flashy is having trouble right now. Retrying automatically.',
  },
} as const;

/** The app's one global error channel (ADR 062): connectivity only. It clears itself
 * when the probe recovers (ADR 063), so it has no dismiss control. */
export default function ConnectionBanner({
  status,
}: {
  status: Exclude<ConnectionStatus, 'online'>;
}) {
  const { Icon, text } = BANNER[status];
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-(--color-warning) px-3 py-2 text-sm text-(--color-text)"
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}
