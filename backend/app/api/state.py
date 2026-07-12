from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Character, ChatMessage, ChatThread, UserProfile
from app.schemas.state import (
    AppStateSchema,
    CharacterSchema,
    ChatThreadSchema,
    MessageSchema,
    UserProfileSchema,
)

router = APIRouter(prefix="/api/v1/state", tags=["state"])


def serialize_profile(profile: UserProfile) -> UserProfileSchema:
    return UserProfileSchema(
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


def serialize_thread(thread: ChatThread, messages: List[ChatMessage]) -> ChatThreadSchema:
    return ChatThreadSchema(
        id=thread.id,
        characterId=thread.character_id,
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
    profile = db.get(UserProfile, "default")
    if profile is None:
        profile = UserProfile(
            id="default",
            name="旅人",
            avatar="Crown",
            description="一个行经此处的冒险者。",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    characters = list(db.scalars(select(Character).order_by(Character.created_at)).all())
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
        characters=[serialize_character(character) for character in characters],
        threads=[serialize_thread(thread, messages_by_thread.get(thread.id, [])) for thread in threads],
    )


@router.put("", response_model=AppStateSchema)
def replace_state(payload: AppStateSchema, db: Session = Depends(get_db)) -> AppStateSchema:
    db.execute(delete(ChatMessage))
    db.execute(delete(ChatThread))
    db.execute(delete(Character))

    profile = db.get(UserProfile, "default")
    if profile is None:
        profile = UserProfile(id="default")
        db.add(profile)
    profile.name = payload.profile.name
    profile.avatar = payload.profile.avatar
    profile.description = payload.profile.description
    profile.gender = payload.profile.gender
    profile.personality = payload.profile.personality
    profile.appearance = payload.profile.appearance
    profile.is_initialized = True

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
    for thread in payload.threads:
        if thread.character_id not in character_ids:
            continue
        db.add(
            ChatThread(
                id=thread.id,
                character_id=thread.character_id,
                title=thread.title,
                timestamp=thread.timestamp,
            )
        )
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
