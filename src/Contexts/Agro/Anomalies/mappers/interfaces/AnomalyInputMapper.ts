import type { CreateAnomalyDto } from '../../application/useCases/interfaces/CreateAnomalyDto.js';
import type { UpdateAnomalyInput } from '../../application/useCases/interfaces/UpdateAnomalyInput.js';
import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyGuidanceChanges } from '../../domain/entities/types/AnomalyGuidanceChanges.js';

export interface AnomalyInputMapper {
  fromCreateDto(dto: CreateAnomalyDto, user: string): Anomaly;
  toChanges(input: UpdateAnomalyInput): AnomalyGuidanceChanges;
}
