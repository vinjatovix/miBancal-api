import type { AwilixContainer } from 'awilix';
import type { Db, MongoClient } from 'mongodb';

import type { AnomalyReadRepository } from '../../../Contexts/Agro/Anomalies/application/queries/index.js';
import type {
  CreateAnomaly,
  DeleteAnomaly,
  GetAnomalyBySlug,
  ListAnomalies,
  UpdateAnomaly
} from '../../../Contexts/Agro/Anomalies/application/useCases/index.js';
import type { MongoAnomalyRepository } from '../../../Contexts/Agro/Anomalies/infrastructure/persistence/MongoAnomalyRepository.js';
import type { AnomalyPersistenceMapper } from '../../../Contexts/Agro/Anomalies/mappers/interfaces/AnomalyPersistenceMapper.js';
import type {
  CreateBed,
  DeleteBed,
  GetBedById,
  ListUserBeds,
  UpdateBed
} from '../../../Contexts/Agro/Beds/application/useCases/index.js';
import type { MongoBedRepository } from '../../../Contexts/Agro/Beds/infrastructure/persistence/MongoBedRepository.js';
import type { BedPersistenceMapper } from '../../../Contexts/Agro/Beds/mappers/interfaces/BedPersistenceMapper.js';
import type {
  AddPlantBookmark,
  CheckPlantBookmark,
  GetUserBookmarks,
  RemovePlantBookmark
} from '../../../Contexts/Agro/Bookmarks/application/useCases/index.js';
import type { MongoUserBookmarksRepository } from '../../../Contexts/Agro/Bookmarks/infrastructure/persistence/MongoUserBookmarksRepository.js';
import type { UserBookmarksPersistenceMapper } from '../../../Contexts/Agro/Bookmarks/mappers/interfaces/UserBookmarksPersistenceMapper.js';
import type { FamilyReadRepository } from '../../../Contexts/Agro/Families/application/queries/index.js';
import type {
  CreateFamily,
  GetFamilyById,
  GetFamilyBySlug,
  ListFamilies,
  UpdateFamily
} from '../../../Contexts/Agro/Families/application/useCases/index.js';
import type { MongoFamilyRepository } from '../../../Contexts/Agro/Families/infrastructure/persistence/MongoFamilyRepository.js';
import type { FamilyPersistenceMapper } from '../../../Contexts/Agro/Families/mappers/interfaces/FamilyPersistenceMapper.js';
import type { GardenInputReadRepository } from '../../../Contexts/Agro/GardenInputs/application/queries/index.js';
import type {
  CreateGardenInput,
  DeleteGardenInput,
  GetGardenInputByIdOrSlug,
  ListGardenInputs,
  UpdateGardenInput
} from '../../../Contexts/Agro/GardenInputs/application/useCases/index.js';
import type { MongoGardenInputRepository } from '../../../Contexts/Agro/GardenInputs/infrastructure/persistence/MongoGardenInputRepository.js';
import type { GardenInputPersistenceMapper } from '../../../Contexts/Agro/GardenInputs/mappers/interfaces/GardenInputPersistenceMapper.js';
import type {
  GetPlantInstanceById,
  ListPlantInstances,
  PlacePlantInstance,
  RemovePlantInstance,
  UpdatePlantInstance
} from '../../../Contexts/Agro/PlantInstances/application/useCases/index.js';
import type { CropSpatialService } from '../../../Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import type { MongoPlantInstanceRepository } from '../../../Contexts/Agro/PlantInstances/infrastructure/persistence/MongoPlantInstanceRepository.js';
import type { PlantInstancePersistenceMapper } from '../../../Contexts/Agro/PlantInstances/mappers/interfaces/PlantInstancePersistenceMapper.js';
import type {
  CheckPlantLike,
  LikePlant,
  UnlikePlant
} from '../../../Contexts/Agro/PlantLikes/application/useCases/index.js';
import type { MongoPlantLikeRepository } from '../../../Contexts/Agro/PlantLikes/infrastructure/persistence/MongoPlantLikeRepository.js';
import type { PlantLikePersistenceMapper } from '../../../Contexts/Agro/PlantLikes/mappers/interfaces/PlantLikePersistenceMapper.js';
import type {
  FamilySummaryReader as PlantRelationFamilySummaryReader,
  PlantRelationReadRepository,
  PlantSummaryReader
} from '../../../Contexts/Agro/PlantRelations/application/queries/index.js';
import type {
  CreatePlantRelation,
  DeletePlantRelation,
  GetPlantRelationById,
  ListPlantRelations,
  UpdatePlantRelation
} from '../../../Contexts/Agro/PlantRelations/application/useCases/index.js';
import type { CompanionEvaluationService } from '../../../Contexts/Agro/PlantRelations/domain/services/CompanionEvaluationService.js';
import type { PlantRelationQueryMapper } from '../../../Contexts/Agro/PlantRelations/infrastructure/persistence/mappers/PlantRelationQueryMapper.js';
import type { MongoPlantRelationRepository } from '../../../Contexts/Agro/PlantRelations/infrastructure/persistence/MongoPlantRelationRepository.js';
import type { PlantRelationPersistenceMapper } from '../../../Contexts/Agro/PlantRelations/mappers/interfaces/PlantRelationPersistenceMapper.js';
import type {
  FamilySummaryReader,
  PlantReadRepository
} from '../../../Contexts/Agro/Plants/application/queries/index.js';
import type {
  CreatePlant,
  DeletePlant,
  GetPlant,
  ListPlants,
  UpdatePlant
} from '../../../Contexts/Agro/Plants/application/useCases/index.js';
import type { PlantQueryMapper } from '../../../Contexts/Agro/Plants/infrastructure/persistence/mongo/mappers/PlantQueryMapper.js';
import type { MongoPlantLikesCounterRepository } from '../../../Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantLikesCounterRepository.js';
import type { MongoPlantRepository } from '../../../Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantRepository.js';
import type { PlantPersistenceMapper } from '../../../Contexts/Agro/Plants/mappers/interfaces/PlantPersistenceMapper.js';
import type { AccountNotifier } from '../../../Contexts/Auth/application/notifications/index.js';
import type {
  ProviderUserResolver,
  SessionTokenIssuer
} from '../../../Contexts/Auth/application/services/index.js';
import type {
  ActivateAccount,
  AuthenticateWithGithub,
  AuthenticateWithGoogle,
  ChangeUserRoles,
  ForgotPassword,
  LoginUserLocal,
  LookupUser,
  RefreshToken,
  RegisterUserLocal,
  ResetPassword,
  UpdatePasswordLocal
} from '../../../Contexts/Auth/application/useCases/index.js';
import type { MongoAuthRepository } from '../../../Contexts/Auth/infrastructure/persistence/MongoAuthRepository.js';
import type { CheckHealth } from '../../../Contexts/health/application/useCases/CheckHealth.js';
import type { BackgroundTasks } from '../../../Contexts/shared/application/background/index.js';
import type { UnitOfWork } from '../../../Contexts/shared/application/interfaces/index.js';
import type { Mailer } from '../../../Contexts/shared/application/mailer/index.js';
import type {
  AppLogger,
  EncrypterTool,
  GithubIdentityProviderTool,
  GoogleIdTokenVerifierTool,
  OneTimeTokenTool
} from '../../../Contexts/shared/plugins/index.js';
import type { DBEnvironmentArranger } from '../../../shared/infrastructure/persistence/index.js';
import type {
  CreateAnomalyController,
  DeleteAnomalyController,
  GetAllAnomaliesController,
  GetAnomalyBySlugController,
  UpdateAnomalyController
} from '../controllers/Anomalies/index.js';
import type {
  ActivateAccountController,
  AuthenticateWithGithubController,
  AuthenticateWithGoogleController,
  ForgotPasswordController,
  LoginUserLocalController,
  RefreshTokenController,
  RegisterUserLocalController,
  ResetPasswordController,
  UpdatePasswordLocalController
} from '../controllers/Auth/index.js';
import type {
  CreateBedController,
  DeleteBedController,
  GetBedByIdController,
  GetUserBedsController,
  UpdateBedController
} from '../controllers/Beds/index.js';
import type {
  AddPlantBookmarkController,
  CheckPlantBookmarkController,
  GetUserBookmarksController,
  RemovePlantBookmarkController
} from '../controllers/Bookmarks/index.js';
import type {
  CreateFamilyController,
  GetAllFamiliesController,
  GetFamilyBySlugController,
  UpdateFamilyController
} from '../controllers/Families/index.js';
import type {
  CreateGardenInputController,
  DeleteGardenInputController,
  GetGardenInputByIdOrSlugController,
  ListGardenInputsController,
  UpdateGardenInputController
} from '../controllers/GardenInputs/index.js';
import type { HealthController } from '../controllers/health/HealthController.js';
import type {
  GetPlantInstanceByIdController,
  ListPlantInstancesController,
  PlacePlantInstanceController,
  RemovePlantInstanceController,
  UpdatePlantInstanceController
} from '../controllers/PlantInstances/index.js';
import type {
  CheckPlantLikeController,
  LikePlantController,
  UnlikePlantController
} from '../controllers/PlantLikes/index.js';
import type {
  CreatePlantRelationController,
  DeletePlantRelationController,
  GetPlantRelationByIdController,
  ListPlantRelationsController,
  UpdatePlantRelationController
} from '../controllers/PlantRelations/index.js';
import type {
  CreatePlantController,
  DeletePlantController,
  GetAllPlantsController,
  GetPlantByIdController,
  UpdatePlantController
} from '../controllers/Plants/index.js';
import type {
  ChangeUserRolesController,
  LookupUserController
} from '../controllers/Users/index.js';

export type ContainerCradle = {
  // Explicit values
  db: Db;
  DBClient: MongoClient;
  appVersion: string;
  logger: AppLogger;
  bedPersistenceMapper: BedPersistenceMapper;
  familyPersistenceMapper: FamilyPersistenceMapper;
  anomalyPersistenceMapper: AnomalyPersistenceMapper;
  gardenInputPersistenceMapper: GardenInputPersistenceMapper;
  plantPersistenceMapper: PlantPersistenceMapper;
  plantInstancePersistenceMapper: PlantInstancePersistenceMapper;
  userBookmarksPersistenceMapper: UserBookmarksPersistenceMapper;
  plantLikePersistenceMapper: PlantLikePersistenceMapper;
  plantRelationPersistenceMapper: PlantRelationPersistenceMapper;
  cropSpatialService: CropSpatialService;
  companionEvaluationService: CompanionEvaluationService;
  unitOfWork: UnitOfWork;
  familySummaryReader: FamilySummaryReader & PlantRelationFamilySummaryReader;
  plantSummaryReader: PlantSummaryReader;
  mailer: Mailer;
  backgroundTasks: BackgroundTasks;
  accountNotifier: AccountNotifier;
  providerUserResolver: ProviderUserResolver;
  sessionTokenIssuer: SessionTokenIssuer;
  frontendBaseUrl: string;
  googleClientId: string;
  githubClientId: string;
  githubClientSecret: string;
  githubRedirectUri: string;

  // Singletons
  environmentArranger: DBEnvironmentArranger;
  encrypter: EncrypterTool;
  googleIdTokenVerifier: GoogleIdTokenVerifierTool;
  githubIdentityProvider: GithubIdentityProviderTool;
  oneTimeToken: OneTimeTokenTool;
  authRepository: MongoAuthRepository;
  familyRepository: MongoFamilyRepository;
  familyReadRepository: FamilyReadRepository;
  anomalyRepository: MongoAnomalyRepository;
  anomalyReadRepository: AnomalyReadRepository;
  gardenInputRepository: MongoGardenInputRepository;
  gardenInputReadRepository: GardenInputReadRepository;
  plantRepository: MongoPlantRepository;
  plantReadRepository: PlantReadRepository;
  bedRepository: MongoBedRepository;
  plantInstanceRepository: MongoPlantInstanceRepository;
  userBookmarksRepository: MongoUserBookmarksRepository;
  plantLikeRepository: MongoPlantLikeRepository;
  plantLikesCounterRepository: MongoPlantLikesCounterRepository;
  plantRelationRepository: MongoPlantRelationRepository;
  plantRelationReadRepository: PlantRelationReadRepository;
  plantRelationQueryMapper: PlantRelationQueryMapper;
  plantQueryMapper: PlantQueryMapper;

  // Scoped use cases
  checkHealth: CheckHealth;
  registerUserLocal: RegisterUserLocal;
  loginUserLocal: LoginUserLocal;
  authenticateWithGoogle: AuthenticateWithGoogle;
  authenticateWithGithub: AuthenticateWithGithub;
  activateAccount: ActivateAccount;
  forgotPassword: ForgotPassword;
  resetPassword: ResetPassword;
  refreshToken: RefreshToken;
  updatePasswordLocal: UpdatePasswordLocal;
  changeUserRoles: ChangeUserRoles;
  lookupUser: LookupUser;
  createFamily: CreateFamily;
  getFamilyById: GetFamilyById;
  getFamilyBySlug: GetFamilyBySlug;
  listFamilies: ListFamilies;
  updateFamily: UpdateFamily;
  getAnomalyBySlug: GetAnomalyBySlug;
  listAnomalies: ListAnomalies;
  createAnomaly: CreateAnomaly;
  updateAnomaly: UpdateAnomaly;
  deleteAnomaly: DeleteAnomaly;
  getGardenInputByIdOrSlug: GetGardenInputByIdOrSlug;
  listGardenInputs: ListGardenInputs;
  createGardenInput: CreateGardenInput;
  updateGardenInput: UpdateGardenInput;
  deleteGardenInput: DeleteGardenInput;
  createPlant: CreatePlant;
  getPlant: GetPlant;
  listPlants: ListPlants;
  updatePlant: UpdatePlant;
  deletePlant: DeletePlant;
  createBed: CreateBed;
  listUserBeds: ListUserBeds;
  getBedById: GetBedById;
  updateBed: UpdateBed;
  deleteBed: DeleteBed;
  placePlantInstance: PlacePlantInstance;
  getPlantInstanceById: GetPlantInstanceById;
  listPlantInstances: ListPlantInstances;
  updatePlantInstance: UpdatePlantInstance;
  removePlantInstance: RemovePlantInstance;
  addPlantBookmark: AddPlantBookmark;
  removePlantBookmark: RemovePlantBookmark;
  getUserBookmarks: GetUserBookmarks;
  checkPlantBookmark: CheckPlantBookmark;
  likePlant: LikePlant;
  unlikePlant: UnlikePlant;
  checkPlantLike: CheckPlantLike;
  createPlantRelation: CreatePlantRelation;
  getPlantRelationById: GetPlantRelationById;
  listPlantRelations: ListPlantRelations;
  updatePlantRelation: UpdatePlantRelation;
  deletePlantRelation: DeletePlantRelation;

  // Scoped controllers
  healthController: HealthController;
  registerUserLocalController: RegisterUserLocalController;
  loginUserLocalController: LoginUserLocalController;
  authenticateWithGoogleController: AuthenticateWithGoogleController;
  authenticateWithGithubController: AuthenticateWithGithubController;
  activateAccountController: ActivateAccountController;
  forgotPasswordController: ForgotPasswordController;
  resetPasswordController: ResetPasswordController;
  refreshTokenController: RefreshTokenController;
  updatePasswordLocalController: UpdatePasswordLocalController;
  changeUserRolesController: ChangeUserRolesController;
  lookupUserController: LookupUserController;
  createFamilyController: CreateFamilyController;
  getAllFamiliesController: GetAllFamiliesController;
  getFamilyBySlugController: GetFamilyBySlugController;
  updateFamilyController: UpdateFamilyController;
  getAnomalyBySlugController: GetAnomalyBySlugController;
  getAllAnomaliesController: GetAllAnomaliesController;
  createAnomalyController: CreateAnomalyController;
  updateAnomalyController: UpdateAnomalyController;
  deleteAnomalyController: DeleteAnomalyController;
  getGardenInputByIdOrSlugController: GetGardenInputByIdOrSlugController;
  listGardenInputsController: ListGardenInputsController;
  createGardenInputController: CreateGardenInputController;
  updateGardenInputController: UpdateGardenInputController;
  deleteGardenInputController: DeleteGardenInputController;
  createPlantController: CreatePlantController;
  getAllPlantsController: GetAllPlantsController;
  getPlantByIdController: GetPlantByIdController;
  updatePlantController: UpdatePlantController;
  deletePlantController: DeletePlantController;
  createBedController: CreateBedController;
  getUserBedsController: GetUserBedsController;
  getBedByIdController: GetBedByIdController;
  updateBedController: UpdateBedController;
  deleteBedController: DeleteBedController;
  createPlantRelationController: CreatePlantRelationController;
  getPlantRelationByIdController: GetPlantRelationByIdController;
  listPlantRelationsController: ListPlantRelationsController;
  updatePlantRelationController: UpdatePlantRelationController;
  deletePlantRelationController: DeletePlantRelationController;
  placePlantInstanceController: PlacePlantInstanceController;
  getPlantInstanceByIdController: GetPlantInstanceByIdController;
  listPlantInstancesController: ListPlantInstancesController;
  updatePlantInstanceController: UpdatePlantInstanceController;
  removePlantInstanceController: RemovePlantInstanceController;
  addPlantBookmarkController: AddPlantBookmarkController;
  removePlantBookmarkController: RemovePlantBookmarkController;
  getUserBookmarksController: GetUserBookmarksController;
  checkPlantBookmarkController: CheckPlantBookmarkController;
  likePlantController: LikePlantController;
  unlikePlantController: UnlikePlantController;
  checkPlantLikeController: CheckPlantLikeController;
};

export type AppContainer = AwilixContainer<ContainerCradle>;
