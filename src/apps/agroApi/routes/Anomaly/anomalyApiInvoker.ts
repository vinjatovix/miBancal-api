import { makeInvoker } from 'awilix-express';
import type {
  CreateAnomalyController,
  DeleteAnomalyController,
  GetAllAnomaliesController,
  GetAnomalyBySlugController,
  UpdateAnomalyController
} from '../../controllers/Anomalies/index.js';

const api = ({
  createAnomalyController,
  getAllAnomaliesController,
  getAnomalyBySlugController,
  updateAnomalyController,
  deleteAnomalyController
}: {
  createAnomalyController: CreateAnomalyController;
  getAllAnomaliesController: GetAllAnomaliesController;
  getAnomalyBySlugController: GetAnomalyBySlugController;
  updateAnomalyController: UpdateAnomalyController;
  deleteAnomalyController: DeleteAnomalyController;
}) => ({
  createAnomaly: createAnomalyController.run,
  getAllAnomalies: getAllAnomaliesController.run,
  getAnomalyBySlug: getAnomalyBySlugController.run,
  updateAnomaly: updateAnomalyController.run,
  deleteAnomaly: deleteAnomalyController.run
});

export const anomalyApiInvoker = makeInvoker(api);
