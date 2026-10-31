import { makeInvoker } from 'awilix-express';
import type {
  CreateGardenInputController,
  DeleteGardenInputController,
  GetGardenInputByIdOrSlugController,
  ListGardenInputsController,
  UpdateGardenInputController
} from '../../controllers/GardenInputs/index.js';

const api = ({
  listGardenInputsController,
  getGardenInputByIdOrSlugController,
  createGardenInputController,
  updateGardenInputController,
  deleteGardenInputController
}: {
  listGardenInputsController: ListGardenInputsController;
  getGardenInputByIdOrSlugController: GetGardenInputByIdOrSlugController;
  createGardenInputController: CreateGardenInputController;
  updateGardenInputController: UpdateGardenInputController;
  deleteGardenInputController: DeleteGardenInputController;
}) => ({
  listGardenInputs: listGardenInputsController.run,
  getGardenInputByIdOrSlug: getGardenInputByIdOrSlugController.run,
  createGardenInput: createGardenInputController.run,
  updateGardenInput: updateGardenInputController.run,
  deleteGardenInput: deleteGardenInputController.run
});

export const gardenInputApiInvoker = makeInvoker(api);
