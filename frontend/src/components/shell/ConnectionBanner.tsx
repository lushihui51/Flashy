import { TriangleAlert, WifiOff } from 'lucide-react';
import Banner from 'src/components/shell/Banner';
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

/** The app's one global error channel: connectivity only. It clears itself when the
 * probe recovers, so it has no dismiss control. */
export default function ConnectionBanner({
  status,
}: {
  status: Exclude<ConnectionStatus, 'online'>;
}) {
  const { Icon, text } = BANNER[status];
  return (
    <Banner color="wrong" Icon={Icon}>
      {text}
    </Banner>
  );
}
