class Refusal(ValueError):
    """A refusal the API answers with a `{code, message}` detail. `code` names the
    refusal for the frontend, which chooses the sentence the user reads from it;
    `message` describes the refusal in the code's own terms, for a developer."""

    code: str
    message: str

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message

    @property
    def detail(self) -> dict[str, str]:
        """`{"code": code, "message": message}`, the HTTPException detail."""
        return {"code": self.code, "message": self.message}
