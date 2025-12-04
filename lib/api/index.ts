/**
 * API操作のエントリポイント
 */

// Data Client (遅延初期化関数をエクスポート)
export { getDataClient } from './data-client';

// 型エクスポート
export type {
  User,
  Instructor,
  Service,
  Reservation,
  Todo,
  Role,
  Membership,
  ServiceCategory,
  ServiceStatus,
  ReservationStatus,
  TodoPriority,
  InstructorStatus,
} from './data-client';

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

// Todos API
export {
  listTodos,
  getTodo,
  createTodo,
  updateTodo,
  toggleTodoComplete,
  deleteTodo,
} from './todos';
