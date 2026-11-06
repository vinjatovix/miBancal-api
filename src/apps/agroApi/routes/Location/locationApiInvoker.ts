import { makeInvoker } from 'awilix-express';

import type { CreateLocationController } from '../../controllers/Locations/CreateLocationController.js';
import type { DeleteLocationController } from '../../controllers/Locations/DeleteLocationController.js';
import type { GetLocationByIdController } from '../../controllers/Locations/GetLocationByIdController.js';
import type { GetUserLocationsController } from '../../controllers/Locations/GetUserLocationsController.js';
import type { LocationBedsLayoutPatchController } from '../../controllers/Locations/LocationBedsLayoutPatchController.js';
import type { LocationLayoutGetController } from '../../controllers/Locations/LocationLayoutGetController.js';
import type { UpdateLocationController } from '../../controllers/Locations/UpdateLocationController.js';

const api = ({
  createLocationController,
  getUserLocationsController,
  getLocationByIdController,
  updateLocationController,
  deleteLocationController,
  locationBedsLayoutPatchController,
  locationLayoutGetController
}: {
  createLocationController: CreateLocationController;
  getUserLocationsController: GetUserLocationsController;
  getLocationByIdController: GetLocationByIdController;
  updateLocationController: UpdateLocationController;
  deleteLocationController: DeleteLocationController;
  locationBedsLayoutPatchController: LocationBedsLayoutPatchController;
  locationLayoutGetController: LocationLayoutGetController;
}) => ({
  createLocation: createLocationController.run,
  listUserLocations: getUserLocationsController.run,
  getLocationById: getLocationByIdController.run,
  updateLocation: updateLocationController.run,
  deleteLocation: deleteLocationController.run,
  updateBedsLayout: locationBedsLayoutPatchController.run,
  getLocationLayout: locationLayoutGetController.run
});

export const locationApiInvoker = makeInvoker(api);
