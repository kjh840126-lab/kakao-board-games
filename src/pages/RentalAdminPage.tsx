import { useState } from 'react';
import type { Rental } from '../types';
import { AlertTriangle, Clock } from 'lucide-react';

export function RentalAdminPage({ app }: { app: any }) {
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');

  const today = new Date().toISOString().split('T')[0];

  const activeRentals = app.rentals.filter((r: Rental) => r.status === '대여중');

  // 연체 여부 판단 (종료일이 오늘 이전인 건)
  const overdueRentals = activeRentals.filter((r: Rental) => r.endDate < today);

  const displayedRentals = filter === 'overdue' ? overdueRentals : activeRentals;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-slate-800 text-base">📋 전체 대여/연체 관리</h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            전체 대여중 ({activeRentals.length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-2.5 py-1 rounded-lg font-medium ${filter === 'overdue' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            연체중 ({overdueRentals.length})
          </button>
        </div>
      </div>

      {displayedRentals.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-xl">
          조건에 부합하는 대여 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {displayedRentals.map((rental: Rental) => {
            const isOverdue = rental.endDate < today;

            return (
              <div key={rental.rentalId} className={`p-3 rounded-xl border ${isOverdue ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">대여회원: {rental.userId}</span>
                    <h3 className="font-bold text-slate-900 text-sm">{rental.gameTitle}</h3>
                  </div>
                  {isOverdue && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} /> 연체 발생
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={12} /> {rental.startDate} ~ {rental.endDate}</span>
                  
                  {isOverdue && (
                    <button
                      onClick={() => app.applyOverduePenalty(rental.userId, 1, 1)}
                      className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-red-700"
                    >
                      패널티 부여 (+1점)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}