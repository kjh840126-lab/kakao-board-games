import type { Game } from '../types';
import { Users, Clock, Star } from 'lucide-react';

export function GameListPage({ app }: { app: any }) {
  // 노출 여부(isVisible === 'Y')인 게임만 바인딩
  const visibleGames = app.games.filter((g: Game) => g.isVisible === 'Y');

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800">
        📢 1인당 최대 <strong>3개</strong>까지 보드게임 대여가 가능합니다.
      </div>

      <div className="grid gap-4">
        {visibleGames.map((game: Game) => {
          const isAvailable = game.status === '대여가능';

          return (
            <div key={game.gameId} className="border border-slate-200 rounded-xl p-3 flex gap-3 bg-white shadow-sm">
              <img
                src={game.imageUrl}
                alt={game.title}
                className="w-24 h-24 object-cover rounded-lg bg-slate-100 flex-shrink-0"
              />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 text-base">{game.title}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {game.gameId}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{game.description}</p>

                  <div className="flex gap-2 text-[11px] text-slate-600 mt-2">
                    <span className="flex items-center gap-0.5"><Users size={12} /> {game.minPlayers}-{game.maxPlayers}명</span>
                    <span className="flex items-center gap-0.5"><Clock size={12} /> {game.playTime}분</span>
                    <span className="flex items-center gap-0.5"><Star size={12} /> {game.difficulty}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
                  <div className="flex gap-1">
                    {game.genres.map((g: string) => (
                      <span key={g} className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                        {g}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => app.addToCart(game)}
                    disabled={!isAvailable}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition ${
                      isAvailable
                        ? 'bg-amber-400 text-slate-900 hover:bg-amber-500'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {game.status}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}