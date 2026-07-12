import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.state import get_state, replace_state
from app.db.base import Base
from app.schemas.state import AppStateSchema
import app.models  # noqa: F401


class StateApiTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_replaces_and_reads_complete_state(self):
        payload = AppStateSchema.model_validate(
            {
                "profile": {
                    "name": "旅人",
                    "avatar": "Crown",
                    "description": "测试用户",
                },
                "characters": [
                    {
                        "id": "char-test",
                        "name": "测试角色",
                        "tagline": "用于测试",
                        "avatar": "Bot",
                        "category": "custom",
                        "personality": "冷静",
                        "scenario": "测试场景",
                        "firstMessage": "你好",
                        "systemInstruction": "保持角色",
                        "isCustom": True,
                        "starters": ["开始吧"],
                    }
                ],
                "threads": [
                    {
                        "id": "thread-test",
                        "characterId": "char-test",
                        "title": "测试对话",
                        "timestamp": 1,
                        "messages": [
                            {
                                "id": "message-test",
                                "role": "user",
                                "content": "你好",
                                "timestamp": 1,
                            }
                        ],
                    }
                ],
            }
        )

        state = replace_state(payload, self.db)
        self.assertEqual(state.profile.name, "旅人")
        self.assertEqual(state.characters[0].first_message, "你好")
        self.assertEqual(state.threads[0].messages[0].content, "你好")

        loaded = get_state(self.db)
        self.assertEqual(len(loaded.characters), 1)
        self.assertEqual(len(loaded.threads), 1)


if __name__ == "__main__":
    unittest.main()
