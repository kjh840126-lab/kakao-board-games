import type { Rental } from '../types';
import { RotateCcw, CheckCircle2 } from 'lucide-react';

export function ReturnPage({ app }: { app: any }) {
  const userRentals = app.rentals.filter((r: Rental) => r.userId === app.currentUser.userId);
  const activeRentals = userRentals.filter((r: Rental) => r.status === '대여중');
  const pastRentals = userRentals.filter((r: Rental) => r.status === '반납완료');

  return (
    <div className="space-y-6">
      {/* 현재 대여 현황 배지 */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
        <div>
          <span className="text-xs text-slate-400 block">대여중인 보드게임</span>
          <span className="text-xl font-black text-amber-400">{activeRentals.length} / 3 개</span>
        </div>
        {activeRentals.length > 0 && (
          <button
            onClick={app.returnAllGames}
            className="bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-amber-500"
          >
            <RotateCcw size={14} />
            일괄 반납하기
          </button>
        )}
      </div>

      {/* 대여 중 리스트 */}
      <section>
        <h3 className="font-bold text-sm text-slate-800 mb-2">현재 대여 중인 보드게임</h3>
        {activeRentals.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            현재 대여중인 보드게임이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {activeRentals.map((rental: Rental) => (
              <div key={rental.rentalId} className="border border-amber-200 bg-amber-50/50 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{rental.gameTitle}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    대여일: {rental.startDate} ~ 반납예정: {rental.endDate}
                  </p>
                </div>
                <button
                  onClick={() => app.returnGame(rental.rentalId)}
                  className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800"
                >
                  반납하기
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 대여 히스토리 */}
      <section>
        <h3 className="font-bold text-sm text-slate-800 mb-2">대여 히스토리</h3>
        {pastRentals.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">반납 완료된 기록이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {pastRentals.map((rental: Rental) => (
              <div key={rental.rentalId} className="border border-slate-200 p-3 rounded-xl flex justify-between items-center bg-white">
                <div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <h4 className="font-bold text-slate-800 text-xs">{rental.gameTitle}</h4>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {rental.startDate} ~ {rental.returnedAt?.split(' ')[0]} (반납완료)
                  </p>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">완료</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}