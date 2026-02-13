/**
 * API操作のエントリポイント
 */

// Services API
export {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} from './services';

// Reservations API
export {
  listReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  deleteReservation,
} from './reservations';
export type { Reservation } from './reservations';

// Profile API
export {
  getClientProfile,
  createClientProfile,
  updateClientProfile,
  isProfileComplete,
} from './profile';

// Wallet API
export {
  getWallet,
  chargePoints,
  usePoints,
  getTransactionHistory,
} from './wallet';

// Favorites API
export {
  getFavoriteCreators,
  addFavoriteCreator,
  removeFavoriteCreator,
  isFavoriteCreator,
} from './favorites';

// Instructors API
export {
  listInstructors,
  getInstructor,
  getInstructorByUserId,
  createInstructor,
  updateInstructor,
} from './instructors';

// Admin API
export {
  getAdminStats,
  listUsers,
  updateUserRole,
  listPendingCharges,
  approveCharge,
  rejectCharge,
} from './admin';
