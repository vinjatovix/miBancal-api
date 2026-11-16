import { makeInvoker } from 'awilix-express';

import type {
  CreatePlantRelationController,
  GetPlantRelationByIdController,
  ListPlantRelationsController,
  UpdatePlantRelationController,
  DeletePlantRelationController
} from '../../controllers/PlantRelations/index.js';

const api = ({
  createPlantRelationController,
  listPlantRelationsController,
  getPlantRelationByIdController,
  updatePlantRelationController,
  deletePlantRelationController
}: {
  createPlantRelationController: CreatePlantRelationController;
  listPlantRelationsController: ListPlantRelationsController;
  getPlantRelationByIdController: GetPlantRelationByIdController;
  updatePlantRelationController: UpdatePlantRelationController;
  deletePlantRelationController: DeletePlantRelationController;
}) => ({
  createPlantRelation: createPlantRelationController.run,
  listPlantRelations: listPlantRelationsController.run,
  getPlantRelationById: getPlantRelationByIdController.run,
  updatePlantRelation: updatePlantRelationController.run,
  deletePlantRelation: deletePlantRelationController.run
});

export const plantRelationApiInvoker = makeInvoker(api);
