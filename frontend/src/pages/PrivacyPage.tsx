import type { ReactNode } from 'react';
import InlineLink from 'src/components/ui/InlineLink';
import { usePageTitle } from 'src/lib/pageTitle';

/** One part of the page: its heading over its words. */
function Part({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base leading-5.5 font-semibold">{heading}</h2>
      <p className="mt-0.5 text-body leading-[1.3125rem]">{children}</p>
    </section>
  );
}

/** "Privacy": who runs Flashy, what it keeps about a person and why, who else holds it, how a
 * user deletes it, and where to write. */
export default function PrivacyPage() {
  usePageTitle('Privacy');

  return (
    <div className="px-4 pt-4 pb-6 text-(--color-ink)">
      <h1 className="text-page leading-[2.125rem] font-bold tracking-[-0.02em]">Privacy</h1>
      <p className="mt-2.5 text-body leading-[1.3125rem]">
        Flashy is run by Jaden Lu. This page says what Flashy keeps about you, and why.
      </p>

      <div className="mt-4.5 flex flex-col gap-4 border-t border-(--color-line) pt-4.5">
        <Part heading="Looking around">
          If you look around without logging in, Flashy keeps nothing about you.
        </Part>
        <Part heading="Signing in">
          You sign in through Clerk, a sign-in service. When you sign in with Google, Clerk receives
          your name, email address and profile picture. Flashy shows them in your account and uses
          them for nothing else.
        </Part>
        <Part heading="What Flashy keeps">
          What you make and do in Flashy: your decks, cards, practices and runs, every rating you
          give, and when you started your first run. And your time zone, so dates show in your own
          time.
        </Part>
        <Part heading="Who else has it">
          Flashy sells nothing, shares nothing and has no ads or tracking. Clerk holds your sign-in,
          and everything else is stored on Railway, the service that runs Flashy's server.
        </Part>
        <Part heading="Deleting it">
          "Delete account", in your account, deletes your account and everything in it at once. It
          can't be undone.
        </Part>
        <Part heading="Questions">
          Write to{' '}
          <InlineLink href="mailto:shihui.lu51@gmail.com">shihui.lu51@gmail.com</InlineLink>.
        </Part>
      </div>
    </div>
  );
}
