from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth import require_auth
from app.models import Character, ChatMessage, ChatThread, DialogueScenario, UserProfile
from app.schemas.state import (
    AppStateSchema,
    CharacterSchema,
    DialogueScenarioSchema,
    ChatThreadSchema,
    MessageSchema,
    UserProfileSchema,
)

router = APIRouter(
    prefix="/api/v1/state",
    tags=["state"],
    dependencies=[Depends(require_auth)],
)


def serialize_profile(profile: UserProfile) -> UserProfileSchema:
    return UserProfileSchema(
        id=profile.id,
        name=profile.name,
        avatar=profile.avatar,
        description=profile.description,
        gender=profile.gender,
        personality=profile.personality,
        appearance=profile.appearance,
    )


def serialize_character(character: Character) -> CharacterSchema:
    return CharacterSchema(
        id=character.id,
        name=character.name,
        tagline=character.tagline,
        avatar=character.avatar,
        category=character.category,
        personality=character.personality,
        scenario=character.scenario,
        firstMessage=character.first_message,
        systemInstruction=character.system_instruction,
        isCustom=character.is_custom,
        starters=character.starters or [],
    )


def serialize_scenario(scenario: DialogueScenario) -> DialogueScenarioSchema:
    return DialogueScenarioSchema(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        characterId=scenario.character_id,
        location=scenario.location,
        timePeriod=scenario.time_period,
        atmosphere=scenario.atmosphere,
        worldBackground=scenario.world_background,
        relationship=scenario.relationship,
        openingContext=scenario.opening_context,
        plotHooks=scenario.plot_hooks,
        sceneRules=scenario.scene_rules,
        prompt=scenario.prompt,
    )


def serialize_thread(
    thread: ChatThread, messages: List[ChatMessage], default_persona_id: str
) -> ChatThreadSchema:
    return ChatThreadSchema(
        id=thread.id,
        characterId=thread.character_id,
        scenarioId=thread.scenario_id,
        personaId=thread.persona_id or default_persona_id,
        title=thread.title,
        timestamp=thread.timestamp,
        messages=[
            MessageSchema(
                id=message.id,
                role=message.role,
                content=message.content,
                timestamp=message.timestamp,
            )
            for message in messages
        ],
    )


@router.get("", response_model=AppStateSchema)
def get_state(db: Session = Depends(get_db)) -> AppStateSchema:
    profiles = list(db.scalars(select(UserProfile).order_by(UserProfile.created_at)).all())
    if not profiles:
        profile = UserProfile(
            id="default",
            name="旅人",
            avatar="Crown",
            description="一个行经此处的冒险者。",
            is_active=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        profiles = [profile]
    profile = next((item for item in profiles if item.is_active), profiles[0])

    characters = list(db.scalars(select(Character).order_by(Character.created_at)).all())
    scenarios = list(db.scalars(select(DialogueScenario).order_by(DialogueScenario.created_at)).all())
    threads = list(db.scalars(select(ChatThread).order_by(ChatThread.timestamp.desc())).all())
    messages = list(
        db.scalars(
            select(ChatMessage).order_by(ChatMessage.thread_id, ChatMessage.position)
        ).all()
    )
    messages_by_thread: dict[str, List[ChatMessage]] = {}
    for message in messages:
        messages_by_thread.setdefault(message.thread_id, []).append(message)

    return AppStateSchema(
        initialized=profile.is_initialized,
        profile=serialize_profile(profile),
        personas=[serialize_profile(item) for item in profiles],
        activePersonaId=profile.id,
        characters=[serialize_character(character) for character in characters],
        scenarios=[serialize_scenario(scenario) for scenario in scenarios],
        threads=[
            serialize_thread(thread, messages_by_thread.get(thread.id, []), profile.id)
            for thread in threads
        ],
    )


@router.put("", response_model=AppStateSchema)
def replace_state(payload: AppStateSchema, db: Session = Depends(get_db)) -> AppStateSchema:
    db.execute(delete(ChatMessage))
    db.execute(delete(ChatThread))
    db.execute(delete(DialogueScenario))
    db.execute(delete(Character))
    db.execute(delete(UserProfile))

    personas = payload.personas or [payload.profile]
    active_persona_id = payload.active_persona_id or payload.profile.id or personas[0].id
    for item in personas:
        db.add(
            UserProfile(
                id=item.id,
                name=item.name,
                avatar=item.avatar,
                description=item.description,
                gender=item.gender,
                personality=item.personality,
                appearance=item.appearance,
                is_initialized=True,
                is_active=item.id == active_persona_id,
            )
        )
    persona_ids = {item.id for item in personas}

    for item in payload.characters:
        db.add(
            Character(
                id=item.id,
                name=item.name,
                tagline=item.tagline,
                avatar=item.avatar,
                category=item.category,
                personality=item.personality,
                scenario=item.scenario,
                first_message=item.first_message,
                system_instruction=item.system_instruction,
                is_custom=item.is_custom,
                starters=item.starters,
            )
        )

    character_ids = {item.id for item in payload.characters}
    db.flush()
    for item in payload.scenarios:
        db.add(
            DialogueScenario(
                id=item.id,
                name=item.name,
                description=item.description,
                character_id=item.character_id if item.character_id in character_ids else None,
                location=item.location,
                time_period=item.time_period,
                atmosphere=item.atmosphere,
                world_background=item.world_background,
                relationship=item.relationship,
                opening_context=item.opening_context,
                plot_hooks=item.plot_hooks,
                scene_rules=item.scene_rules,
                prompt=item.prompt,
            )
        )

    scenario_ids = {item.id for item in payload.scenarios}
    db.flush()
    valid_threads = []
    for thread in payload.threads:
        if thread.character_id not in character_ids:
            continue
        db.add(
            ChatThread(
                id=thread.id,
                character_id=thread.character_id,
                scenario_id=thread.scenario_id if thread.scenario_id in scenario_ids else None,
                persona_id=thread.persona_id if thread.persona_id in persona_ids else active_persona_id,
                title=thread.title,
                timestamp=thread.timestamp,
            )
        )
        valid_threads.append(thread)

    db.flush()
    for thread in valid_threads:
        for position, message in enumerate(thread.messages):
            db.add(
                ChatMessage(
                    id=message.id,
                    thread_id=thread.id,
                    role=message.role,
                    content=message.content,
                    timestamp=message.timestamp,
                    position=position,
                )
            )

    db.commit()
    return get_state(db)
