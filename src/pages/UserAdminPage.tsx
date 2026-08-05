import type { User } from '../types';
import { User as UserIcon, ShieldAlert } from 'lucide-react';

export function UserAdminPage({ app }: { app: any }) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800 text-base">👥 가입 회원 관리</h2>

      <div className="space-y-3">
        {app.users.map((user: User) => (
          <div key={user.userId} className="border border-slate-200 p-3 rounded-xl bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <UserIcon size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${user.role === '운영자' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{user.userId} | {user.email}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 text-[11px] text-slate-500">
              <div>
                <span>가입일: {user.createdAt}</span>
                <span className="block text-[10px] text-slate-400">최근로그인: {user.lastLoginAt}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-700 flex items-center justify-end gap-1">
                  <ShieldAlert size={12} className={user.penaltyPoints > 0 ? 'text-red-500' : 'text-slate-400'} />
                  패널티: {user.penaltyPoints}점
                </span>
                <span className="text-[10px] text-slate-400 block">
                  종료일: {user.penaltyEndDate || '없음'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}