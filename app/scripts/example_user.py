"""Makes an account the example user, or gives the example user an identity back, in the
database `DATABASE_URL` names:

    uv run python -m app.scripts.example_user detach <clerk_user_id>
    uv run python -m app.scripts.example_user attach <clerk_user_id>

`detach` takes the Clerk identity off the account that holds `clerk_user_id`, so every
guest is shown its library and no session signs in as it. `attach` gives the example
user `clerk_user_id`, so that account can log in and edit the library. Either changes
only the row's `clerk_user_id`. On success it prints the row's id and exits 0; on a
refusal it prints one line on stderr, writes nothing and exits 1."""

import argparse
import sys
from collections.abc import Callable

from sqlmodel import Session

from app.database import engine
from app.database_ops.app_user import (
    db_read_app_user_by_clerk_id,
    db_read_example_app_user,
    db_update_app_user_clerk_id,
)
from app.models.app_user import AppUser


class ExampleUserError(Exception):
    """A refused detach or attach; its message is the line the script prints."""


def detach(db: Session, clerk_user_id: str) -> AppUser:
    """Makes the account holding `clerk_user_id` the example user, and commits. Raises
    `ExampleUserError`, writing nothing, when no row holds the id or an example user
    already exists."""
    user = db_read_app_user_by_clerk_id(db, clerk_user_id)
    if user is None:
        raise ExampleUserError(f"No account has the Clerk id {clerk_user_id}.")
    example = db_read_example_app_user(db)
    if example is not None:
        raise ExampleUserError(f"An example user already exists: app_user {example.id}.")
    return db_update_app_user_clerk_id(db, user, None)


def attach(db: Session, clerk_user_id: str) -> AppUser:
    """Gives the example user `clerk_user_id`, and commits, so the database then has no
    example user. Raises `ExampleUserError`, writing nothing, when there is no example
    user or another row holds the id."""
    example = db_read_example_app_user(db)
    if example is None:
        raise ExampleUserError("The database has no example user.")
    holder = db_read_app_user_by_clerk_id(db, clerk_user_id)
    if holder is not None:
        raise ExampleUserError(f"The Clerk id {clerk_user_id} is held by app_user {holder.id}.")
    return db_update_app_user_clerk_id(db, example, clerk_user_id)


COMMANDS: dict[str, Callable[[Session, str], AppUser]] = {"detach": detach, "attach": attach}


def main(argv: list[str] | None = None) -> int:
    """Runs one command from `argv`, `sys.argv[1:]` when None, and returns the exit status."""
    parser = argparse.ArgumentParser(prog="python -m app.scripts.example_user")
    parser.add_argument("command", choices=COMMANDS)
    parser.add_argument("clerk_user_id")
    args = parser.parse_args(argv)

    with Session(engine) as db:
        try:
            user = COMMANDS[args.command](db, args.clerk_user_id)
        except ExampleUserError as refusal:
            print(refusal, file=sys.stderr)
            return 1
        print(user.id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
