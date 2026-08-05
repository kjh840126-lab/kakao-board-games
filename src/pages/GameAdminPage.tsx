import { useState } from 'react';
import type { Game } from '../types';
import { Plus, Edit, Eye, EyeOff } from 'lucide-react';

export function GameAdminPage({ app }: { app: any }) {
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openNewForm = () => {
    setEditingGame({
      gameId: `G${String(app.games.length + 1).padStart(3, '0')}`,
      title: '',
      status: '대여가능',
      minPlayers: 2,
      maxPlayers: 4,
      playTime: 30,
      difficulty: 2.0,
      imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300',
      description: '',
      isVisible: 'Y',
      genres: ['파티게임'],
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    app.saveGame(editingGame);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-slate-800 text-base">🎮 보드게임 관리</h2>
        <button
          onClick={openNewForm}
          className="bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-amber-500"
        >
          <Plus size={14} /> 신규 등록
        </button>
      </div>

      <div className="space-y-2">
        {app.games.map((game: Game) => (
          <div key={game.gameId} className="border border-slate-200 p-3 rounded-xl flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <img src={game.imageUrl} alt={game.title} className="w-12 h-12 object-cover rounded-lg bg-slate-100" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">{game.title}</h3>
                  <span className="text-[10px] text-slate-400">({game.gameId})</span>
                  {game.isVisible === 'Y' ? (
                    <span className="text-[10px] text-green-600 flex items-center gap-0.5"><Eye size={10} /> 노출중</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><EyeOff size={10} /> 숨김</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">{game.minPlayers}~{game.maxPlayers}명 | {game.playTime}분 | {game.status}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingGame(game);
                setIsModalOpen(true);
              }}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Edit size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* 등록 / 수정 모달 */}
      {isModalOpen && editingGame && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-base">
              {app.games.some((g: Game) => g.gameId === editingGame.gameId) ? '게임 수정' : '신규 게임 등록'}
            </h3>

            <form onSubmit={handleSave} className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">게임 ID</label>
                <input
                  type="text"
                  disabled
                  value={editingGame.gameId}
                  className="w-full bg-slate-100 border border-slate-200 p-2 rounded-lg text-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">게임명 (최대 30자)</label>
                <input
                  type="text"
                  maxLength={30}
                  required
                  value={editingGame.title}
                  onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                  className="w-full border border-slate-200 p-2 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">최소 인원</label>
                  <input
                    type="number"
                    min={1}
                    value={editingGame.minPlayers}
                    onChange={(e) => setEditingGame({ ...editingGame, minPlayers: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">최대 인원</label>
                  <input
                    type="number"
                    min={1}
                    value={editingGame.maxPlayers}
                    onChange={(e) => setEditingGame({ ...editingGame, maxPlayers: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">플레이타임 (분)</label>
                  <input
                    type="number"
                    value={editingGame.playTime}
                    onChange={(e) => setEditingGame({ ...editingGame, playTime: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">화면 노출 여부</label>
                  <select
                    value={editingGame.isVisible}
                    onChange={(e) => setEditingGame({ ...editingGame, isVisible: e.target.value as 'Y' | 'N' })}
                    className="w-full border border-slate-200 p-2 rounded-lg"
                  >
                    <option value="Y">노출 (Y)</option>
                    <option value="N">숨김 (N)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">설명 (최대 100자)</label>
                <textarea
                  maxLength={100}
                  value={editingGame.description}
                  onChange={(e) => setEditingGame({ ...editingGame, description: e.target.value })}
                  className="w-full border border-slate-200 p-2 rounded-lg h-16 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold"
                >
                  취소
                </button>
                <button type="submit" className="flex-1 bg-amber-400 text-slate-900 py-2 rounded-lg font-bold">
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}