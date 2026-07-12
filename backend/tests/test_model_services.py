import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.model_services import get_model_services, replace_model_services, resolve_model_service
from app.core.config import settings
from app.db.base import Base
from app.models import ModelService
from app.schemas.model_service import ModelServicesPayload


class ModelServicesTest(unittest.TestCase):
    def setUp(self):
        self.original_key = settings.MODEL_CREDENTIAL_KEY
        settings.MODEL_CREDENTIAL_KEY = "unit-test-encryption-key"
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        settings.MODEL_CREDENTIAL_KEY = self.original_key

    def test_key_is_encrypted_and_not_returned_by_public_response(self):
        payload = ModelServicesPayload.model_validate(
            {
                "providers": [
                    {
                        "id": "custom-test",
                        "name": "测试平台",
                        "defaultUrl": "https://example.com/v1",
                        "selectedModel": "test-model",
                        "modelGroups": [],
                    }
                ],
                "activeProviderId": "custom-test",
                "apiKeys": {"custom-test": "secret-api-key"},
            }
        )
        response = replace_model_services(payload, self.db)
        row = self.db.scalar(select(ModelService).where(ModelService.id == "custom-test"))

        self.assertIsNotNone(row)
        self.assertNotEqual(row.encrypted_api_key, "secret-api-key")
        self.assertNotIn("apiKey", response.model_dump()["providers"][0])
        self.assertTrue(response.providers[0].hasApiKey)
        self.assertEqual(get_model_services(self.db).activeProviderId, "custom-test")
        self.assertEqual(resolve_model_service("custom-test", self.db).apiKey, "secret-api-key")


if __name__ == "__main__":
    unittest.main()
