import { makeInvoker } from 'awilix-express';
import type { GetPlantInstanceByIdController } from '../../controllers/PlantInstances/GetPlantInstanceByIdController.js';
import type { ListPlantInstancesController } from '../../controllers/PlantInstances/ListPlantInstancesController.js';
import type { PlacePlantInstanceBatchController } from '../../controllers/PlantInstances/PlacePlantInstanceBatchController.js';
import type { PlacePlantInstanceController } from '../../controllers/PlantInstances/PlacePlantInstanceController.js';
import type { RemovePlantInstanceBatchController } from '../../controllers/PlantInstances/RemovePlantInstanceBatchController.js';
import type { RemovePlantInstanceController } from '../../controllers/PlantInstances/RemovePlantInstanceController.js';
import type { UpdatePlantInstanceBatchController } from '../../controllers/PlantInstances/UpdatePlantInstanceBatchController.js';
import type { UpdatePlantInstanceController } from '../../controllers/PlantInstances/UpdatePlantInstanceController.js';

const api = ({
  placePlantInstanceController,
  placePlantInstanceBatchController,
  getPlantInstanceByIdController,
  listPlantInstancesController,
  updatePlantInstanceController,
  updatePlantInstanceBatchController,
  removePlantInstanceController,
  removePlantInstanceBatchController
}: {
  placePlantInstanceController: PlacePlantInstanceController;
  placePlantInstanceBatchController: PlacePlantInstanceBatchController;
  getPlantInstanceByIdController: GetPlantInstanceByIdController;
  listPlantInstancesController: ListPlantInstancesController;
  updatePlantInstanceController: UpdatePlantInstanceController;
  updatePlantInstanceBatchController: UpdatePlantInstanceBatchController;
  removePlantInstanceController: RemovePlantInstanceController;
  removePlantInstanceBatchController: RemovePlantInstanceBatchController;
}) => ({
  placePlantInstance: placePlantInstanceController.run,
  placePlantInstanceBatch: placePlantInstanceBatchController.run,
  getPlantInstanceById: getPlantInstanceByIdController.run,
  listPlantInstances: listPlantInstancesController.run,
  updatePlantInstance: updatePlantInstanceController.run,
  updatePlantInstanceBatch: updatePlantInstanceBatchController.run,
  removePlantInstance: removePlantInstanceController.run,
  removePlantInstanceBatch: removePlantInstanceBatchController.run
});

export const plantInstanceApiInvoker = makeInvoker(api);
