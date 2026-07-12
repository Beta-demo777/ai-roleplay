from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ModelServiceProviderSchema(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=160)
    tagline: str = ""
    isCustom: Optional[bool] = None
    isOn: Optional[bool] = True
    defaultUrl: str = ""
    urlPlaceholder: str = ""
    keyUrl: str = ""
    modelsCount: int = 0
    selectedModel: Optional[str] = None
    modelGroups: List[dict] = Field(default_factory=list)
    hasApiKey: bool = False


class ModelServicesPayload(BaseModel):
    providers: List[ModelServiceProviderSchema]
    activeProviderId: Optional[str] = None
    apiKeys: Dict[str, str] = Field(default_factory=dict)


class ModelServicesResponse(BaseModel):
    providers: List[ModelServiceProviderSchema]
    activeProviderId: Optional[str] = None


class ResolvedModelService(BaseModel):
    providerId: str
    baseUrl: str
    apiKey: str
