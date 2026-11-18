import type { ReactNode, Ref } from 'react';
import Banner from 'src/components/shell/Banner';

/** Tells a guest that the library they see is an example, and that logging in opens the
 * rest. `ref` is handed the banner's element. */
export default function ExampleBanner({ ref }: { ref?: Ref<HTMLDivElement> }): ReactNode {
  return (
    <Banner color="ink" ref={ref}>
      This is an example. Log in to use all of Flashy.
    </Banner>
  );
}
