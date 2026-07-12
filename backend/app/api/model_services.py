import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.auth import require_auth
from app.core.credentials import decrypt_credential, encrypt_credential
from app.core.config import settings
from app.db.session import get_db
from app.models import ModelService
from app.schemas.model_service import (
    ModelServiceProviderSchema,
    ModelServicesPayload,
    ModelServicesResponse,
    ResolvedModelService,
)

router = APIRouter(
    prefix="/api/v1/model-services",
    tags=["model-services"],
    dependencies=[Depends(require_auth)],
)


def require_internal_service(x_internal_service_token: str = Header(default="")) -> None:
    if not secrets.compare_digest(x_internal_service_token, settings.INTERNAL_SERVICE_TOKEN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Internal service only")


def _response(db: Session) -> ModelServicesResponse:
    rows = list(db.scalars(select(ModelService).order_by(ModelService.created_at)).all())
    providers = []
    active_id = None
    for row in rows:
        data = dict(row.config or {})
        data.update({"id": row.id, "name": row.name, "hasApiKey": bool(row.encrypted_api_key)})
        providers.append(ModelServiceProviderSchema.model_validate(data))
        if row.is_active:
            active_id = row.id
    return ModelServicesResponse(providers=providers, activeProviderId=active_id)


@router.get("", response_model=ModelServicesResponse)
def get_model_services(db: Session = Depends(get_db)) -> ModelServicesResponse:
    return _response(db)


@router.put("", response_model=ModelServicesResponse)
def replace_model_services(
    payload: ModelServicesPayload, db: Session = Depends(get_db)
) -> ModelServicesResponse:
    existing = {row.id: row for row in db.scalars(select(ModelService)).all()}
    incoming_ids = {provider.id for provider in payload.providers}
    if incoming_ids:
        db.execute(delete(ModelService).where(ModelService.id.not_in(incoming_ids)))
    else:
        db.execute(delete(ModelService))

    for provider in payload.providers:
        row = existing.get(provider.id) or ModelService(id=provider.id, name=provider.name)
        data = provider.model_dump(exclude={"id", "name", "hasApiKey"})
        row.name = provider.name
        row.config = data
        row.is_active = provider.id == payload.activeProviderId
        if provider.id in payload.apiKeys:
            key = payload.apiKeys[provider.id].strip()
            row.encrypted_api_key = encrypt_credential(key) if key else ""
        db.add(row)
    db.commit()
    return _response(db)


@router.get(
    "/{provider_id}/resolved",
    response_model=ResolvedModelService,
    dependencies=[Depends(require_internal_service)],
)
def resolve_model_service(provider_id: str, db: Session = Depends(get_db)) -> ResolvedModelService:
    row = db.get(ModelService, provider_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模型平台不存在")
    return ResolvedModelService(
        providerId=row.id,
        baseUrl=str((row.config or {}).get("defaultUrl", "")),
        apiKey=decrypt_credential(row.encrypted_api_key) if row.encrypted_api_key else "",
    )
