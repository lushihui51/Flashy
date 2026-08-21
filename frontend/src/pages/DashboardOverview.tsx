import { Show, UserButton, SignInButton, SignUpButton } from '@clerk/react';

export default function DashboardOverview() {
  console.log('pk:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  return (
    <>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
