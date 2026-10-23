import { makeInvoker } from 'awilix-express';
import type { CheckPlantLikeController } from '../../controllers/PlantLikes/CheckPlantLikeController.js';
import type { LikePlantController } from '../../controllers/PlantLikes/LikePlantController.js';
import type { UnlikePlantController } from '../../controllers/PlantLikes/UnlikePlantController.js';

const api = ({
  likePlantController,
  unlikePlantController,
  checkPlantLikeController
}: {
  likePlantController: LikePlantController;
  unlikePlantController: UnlikePlantController;
  checkPlantLikeController: CheckPlantLikeController;
}) => ({
  likePlant: likePlantController.run,
  unlikePlant: unlikePlantController.run,
  checkPlantLike: checkPlantLikeController.run
});

export const plantLikeApiInvoker = makeInvoker(api);
