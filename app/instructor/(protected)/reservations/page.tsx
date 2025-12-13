'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User } from 'lucide-react';

export default function InstructorReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 実際のAPI呼び出しに置き換え
    setLoading(false);
    setReservations([]);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
        <p className="text-sm text-gray-600 mt-1">受け付けた予約を確認・管理します</p>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            予約はまだありません
          </h2>
          <p className="text-gray-500">
            サービスが予約されると、ここに表示されます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 rounded-full p-3">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{reservation.serviceName}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {reservation.date} {reservation.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {reservation.clientName}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                  {reservation.status || '確定'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
