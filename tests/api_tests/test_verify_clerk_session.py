"""verify_clerk_session is never exercised by the rest of the suite — every other test
authenticates through the get_current_app_user dependency override, which bypasses it
entirely (the standard FastAPI testing pattern, but it means the actual verification
logic needs its own coverage). These tests sign tokens with a locally generated RSA
keypair and stub the JWKS client, so no network access to a real Clerk instance is
needed."""

import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.config import settings
from app.verify_clerk_session import verify_clerk_session

TEST_ISSUER = "https://test.clerk.accounts.dev"
TEST_ORIGIN = "http://localhost:5173"


class _FakeSigningKey:
    def __init__(self, key):
        self.key = key


class _FakeJWKClient:
    def __init__(self, public_key):
        self._public_key = public_key

    def get_signing_key_from_jwt(self, token):
        return _FakeSigningKey(self._public_key)


@pytest.fixture
def keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture(autouse=True)
def clerk_settings(monkeypatch):
    monkeypatch.setattr(settings, "clerk_fapi_url", TEST_ISSUER)
    monkeypatch.setattr(settings, "permitted_origins", [TEST_ORIGIN])


@pytest.fixture
def stub_jwks(monkeypatch, keypair):
    _, public_key = keypair
    monkeypatch.setattr(
        "app.verify_clerk_session._jwks_client", lambda: _FakeJWKClient(public_key)
    )


def _make_token(private_key, **claim_overrides):
    now = int(time.time())
    claims = {
        "sub": str(uuid.uuid4()),
        "iss": TEST_ISSUER,
        "azp": TEST_ORIGIN,
        "iat": now,
        "exp": now + 60,
        **claim_overrides,
    }
    return jwt.encode(claims, private_key, algorithm="RS256")


class TestVerifyClerkSession:
    def test_valid_token_returns_payload(self, keypair, stub_jwks):
        private_key, _ = keypair
        token = _make_token(private_key)

        payload = verify_clerk_session(token)

        assert payload["azp"] == TEST_ORIGIN
        assert payload["iss"] == TEST_ISSUER

    def test_wrong_issuer_rejected(self, keypair, stub_jwks):
        private_key, _ = keypair
        token = _make_token(private_key, iss="https://not-us.clerk.accounts.dev")

        with pytest.raises(jwt.InvalidIssuerError):
            verify_clerk_session(token)

    def test_unrecognized_azp_rejected(self, keypair, stub_jwks):
        private_key, _ = keypair
        token = _make_token(private_key, azp="https://evil.example.com")

        with pytest.raises(jwt.InvalidTokenError):
            verify_clerk_session(token)

    def test_expired_token_rejected(self, keypair, stub_jwks):
        private_key, _ = keypair
        now = int(time.time())
        token = _make_token(private_key, iat=now - 3600, exp=now - 1800)

        with pytest.raises(jwt.ExpiredSignatureError):
            verify_clerk_session(token)

    def test_wrong_signing_key_rejected(self, keypair, monkeypatch):
        """Token signed by one keypair, verified against a JWKS client serving a
        different one's public key — the actual signature-forgery scenario JWKS
        verification exists to prevent."""
        private_key, _ = keypair
        other_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        monkeypatch.setattr(
            "app.verify_clerk_session._jwks_client",
            lambda: _FakeJWKClient(other_private_key.public_key()),
        )
        token = _make_token(private_key)

        with pytest.raises(jwt.InvalidSignatureError):
            verify_clerk_session(token)

    def test_missing_required_claim_rejected(self, keypair, stub_jwks):
        private_key, _ = keypair
        now = int(time.time())
        # No 'sub' claim at all.
        token = jwt.encode(
            {"iss": TEST_ISSUER, "azp": TEST_ORIGIN, "iat": now, "exp": now + 60},
            private_key,
            algorithm="RS256",
        )

        with pytest.raises(jwt.MissingRequiredClaimError):
            verify_clerk_session(token)
