import unittest

from app.core.auth import create_session_token, verify_session_token
from app.core.config import settings


class SessionTokenTests(unittest.TestCase):
    def setUp(self):
        self.original_secret = settings.APP_SECRET_KEY
        self.original_hours = settings.AUTH_SESSION_HOURS
        settings.APP_SECRET_KEY = "test-secret-key"
        settings.AUTH_SESSION_HOURS = 2

    def tearDown(self):
        settings.APP_SECRET_KEY = self.original_secret
        settings.AUTH_SESSION_HOURS = self.original_hours

    def test_valid_token(self):
        token = create_session_token(now=1_000)
        self.assertTrue(verify_session_token(token, now=1_001))

    def test_expired_token(self):
        token = create_session_token(now=1_000)
        self.assertFalse(verify_session_token(token, now=8_200))

    def test_tampered_token(self):
        token = create_session_token(now=1_000)
        payload, signature = token.split(".")
        replacement = "A" if signature[-1] != "A" else "B"
        self.assertFalse(verify_session_token(f"{payload}.{signature[:-1]}{replacement}", now=1_001))

    def test_malformed_token(self):
        self.assertFalse(verify_session_token("not-a-token", now=1_001))


if __name__ == "__main__":
    unittest.main()
