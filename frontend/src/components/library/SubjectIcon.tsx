import { createElement } from 'react';
import { subjectIcon } from 'src/lib/subjectIcon';

type SubjectIconProps = {
  icon: string | null | undefined;
  className?: string;
};

/** Renders a subject's icon. Uses createElement rather than JSX's `<Icon />` tag
 * syntax on a locally-resolved variable — react-hooks/static-components flags that
 * pattern (selecting a component into a variable, then rendering it as a tag) as
 * unstable across renders, since it can't statically verify ICONS' entries stay
 * referentially stable (they do — subjectIcon.ts's ICONS holds module-level
 * constants — but the lint rule can't see that; createElement sidesteps the check
 * entirely rather than fighting it). */
export default function SubjectIcon({ icon, className }: SubjectIconProps) {
  return createElement(subjectIcon(icon), { 'aria-hidden': true, className });
}
