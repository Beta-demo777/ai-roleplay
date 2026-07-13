from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class UserProfileSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=120)
    avatar: str = Field(default="User", max_length=80)
    description: str = ""
    gender: Optional[str] = Field(default=None, max_length=80)
    personality: Optional[str] = None
    appearance: Optional[str] = None


class CharacterSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    tagline: str = Field(default="", max_length=300)
    avatar: str = Field(default="Bot", max_length=80)
    category: Literal["fantasy", "cyberpunk", "mystery", "sliceoflife", "custom"] = "custom"
    personality: str = ""
    scenario: str = ""
    first_message: str = Field(default="", alias="firstMessage")
    system_instruction: str = Field(default="", alias="systemInstruction")
    is_custom: bool = Field(default=True, alias="isCustom")
    starters: List[str] = Field(default_factory=list)


class MessageSchema(BaseModel):
    id: str = Field(min_length=1, max_length=180)
    role: Literal["user", "assistant"]
    content: str
    timestamp: int


class DialogueScenarioSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=1, max_length=160)
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    character_id: Optional[str] = Field(default=None, alias="characterId", max_length=120)
    location: str = ""
    time_period: str = Field(default="", alias="timePeriod")
    atmosphere: str = ""
    world_background: str = Field(default="", alias="worldBackground")
    relationship: str = ""
    opening_context: str = Field(default="", alias="openingContext")
    plot_hooks: str = Field(default="", alias="plotHooks")
    scene_rules: str = Field(default="", alias="sceneRules")
    prompt: str = ""


class ChatThreadSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=1, max_length=160)
    character_id: str = Field(alias="characterId", min_length=1, max_length=120)
    scenario_id: Optional[str] = Field(default=None, alias="scenarioId", max_length=160)
    title: str = Field(min_length=1, max_length=300)
    messages: List[MessageSchema] = Field(default_factory=list)
    timestamp: int


class AppStateSchema(BaseModel):
    initialized: bool = False
    profile: UserProfileSchema
    characters: List[CharacterSchema]
    scenarios: List[DialogueScenarioSchema] = Field(default_factory=list)
    threads: List[ChatThreadSchema]
