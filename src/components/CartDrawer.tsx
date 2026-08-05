import type { Game } from '../types';
import { X, Trash2, ShoppingBag } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
}

export function CartDrawer({ isOpen, onClose, app }: CartDrawerProps) {
  if (!isOpen) return null;

  const handleCheckout = () => {
    const success = app.processCheckout();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-amber-400">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-slate-900" />
            <h2 className="font-extrabold text-slate-900 text-base">장바구니</h2>
            <span className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {app.cart.length} / 3
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-slate-800 hover:bg-amber-500 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {app.cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 py-12">
              <ShoppingBag size={40} className="text-slate-200" />
              <p>장바구니에 담긴 보드게임이 없습니다.</p>
            </div>
          ) : (
            app.cart.map((game: Game) => (
              <div 
                key={game.gameId} 
                className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={game.imageUrl} 
                    alt={game.title} 
                    className="w-12 h-12 object-cover rounded-lg bg-slate-100" 
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{game.title}</h3>
                    <p className="text-[11px] text-slate-500">{game.minPlayers}~{game.maxPlayers}인 | {game.playTime}분</p>
                  </div>
                </div>

                <button
                  onClick={() => app.removeFromCart(game.gameId)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {app.cart.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>현재 대여 중인 수량:</span>
                <span className="font-bold text-slate-700">{app.activeRentalsCount}개</span>
              </div>
              <div className="flex justify-between">
                <span>추가 대여 예정 수량:</span>
                <span className="font-bold text-amber-600">+{app.cart.length}개</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition text-sm shadow-md"
            >
              선택한 보드게임 대여하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}