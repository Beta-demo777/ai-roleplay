import unittest

from sqlalchemy import create_engine, text
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
        self.db.execute(text("PRAGMA foreign_keys=ON"))

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_replaces_and_reads_complete_state(self):
        payload = AppStateSchema.model_validate(
            {
                "profile": {
                    "id": "persona-main",
                    "name": "旅人",
                    "avatar": "Crown",
                    "description": "测试用户",
                },
                "personas": [
                    {"id": "persona-main", "name": "旅人", "avatar": "Crown", "description": "测试用户"},
                    {"id": "persona-alt", "name": "骑士", "avatar": "User", "description": "备用人设"},
                ],
                "activePersonaId": "persona-main",
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
                "scenarios": [
                    {
                        "id": "scenario-test",
                        "name": "雨夜酒馆",
                        "characterId": "char-test",
                        "location": "旧城酒馆",
                        "atmosphere": "安静而昏暗",
                        "openingContext": "双方在吧台相遇",
                    }
                ],
                "threads": [
                    {
                        "id": "thread-test",
                        "characterId": "char-test",
                        "scenarioId": "scenario-test",
                        "personaId": "persona-alt",
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
        self.assertEqual(len(state.personas), 2)
        self.assertEqual(state.active_persona_id, "persona-main")
        self.assertEqual(state.characters[0].first_message, "你好")
        self.assertEqual(state.scenarios[0].location, "旧城酒馆")
        self.assertEqual(state.threads[0].scenario_id, "scenario-test")
        self.assertEqual(state.threads[0].persona_id, "persona-alt")
        self.assertEqual(state.threads[0].messages[0].content, "你好")

        loaded = get_state(self.db)
        self.assertEqual(len(loaded.characters), 1)
        self.assertEqual(len(loaded.threads), 1)


if __name__ == "__main__":
    unittest.main()
