import { useState } from 'react';
import type { User, Game, Rental } from '../types';

// 초기 목업 데이터
const INITIAL_USERS: User[] = [
  {
    userId: 'admin.kaka',
    name: '김운영',
    email: 'admin@kaka.com',
    role: '운영자',
    penaltyPoints: 0,
    penaltyEndDate: null,
    createdAt: '2026-01-01',
    lastLoginAt: '2026-08-05 12:00',
  },
  {
    userId: 'user.kaka',
    name: '이회원',
    email: 'user@kaka.com',
    role: '일반회원',
    penaltyPoints: 0,
    penaltyEndDate: null,
    createdAt: '2026-02-15',
    lastLoginAt: '2026-08-05 10:30',
  },
];

const INITIAL_GAMES: Game[] = [
  {
    gameId: 'G001',
    title: '스플렌더',
    status: '대여가능',
    minPlayers: 2,
    maxPlayers: 4,
    playTime: 30,
    difficulty: 2.1,
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300',
    description: '보석상 인쇄업자가 되어 자산을 모으는 전략 게임',
    isVisible: 'Y',
    genres: ['전략게임', '파티게임'],
  },
  {
    gameId: 'G002',
    title: '루미큐브',
    status: '대여중',
    minPlayers: 2,
    maxPlayers: 4,
    playTime: 20,
    difficulty: 1.5,
    imageUrl: 'https://images.unsplash.com/photo-1563941433-b6a0946f75de?w=300',
    description: '숫자 조합을 맞추는 세계적인 타일 게임',
    isVisible: 'Y',
    genres: ['추상전략', '타일 놓기'],
  },
  {
    gameId: 'G003',
    title: '카탄',
    status: '대여가능',
    minPlayers: 3,
    maxPlayers: 4,
    playTime: 60,
    difficulty: 2.3,
    imageUrl: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=300',
    description: '무인도를 개척하고 거래하는 클래식 보드게임',
    isVisible: 'Y',
    genres: ['전략게임'],
  },
];

const INITIAL_RENTALS: Rental[] = [
  {
    rentalId: 101,
    userId: 'user.kaka',
    gameId: 'G002',
    gameTitle: '루미큐브',
    status: '대여중',
    startDate: '2026-08-01',
    endDate: '2026-08-04', // 1일 연체 상태
    returnedAt: null,
  },
];

export function useRentalApp() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [rentals, setRentals] = useState<Rental[]>(INITIAL_RENTALS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[1]); // 기본 일반회원 로그인
  const [cart, setCart] = useState<Game[]>([]);

  // 현재 사용자의 활성(대여중) 대여 수
  const activeRentalsCount = rentals.filter(
    (r) => r.userId === currentUser.userId && r.status === '대여중'
  ).length;

  // 1. 장바구니 담기
  const addToCart = (game: Game) => {
    if (cart.find((item) => item.gameId === game.gameId)) {
      alert('이미 장바구니에 담긴 게임입니다.');
      return;
    }
    if (cart.length >= 3) {
      alert('장바구니에는 최대 3개까지만 담을 수 있습니다.');
      return;
    }
    setCart([...cart, game]);
  };

  const removeFromCart = (gameId: string) => {
    setCart(cart.filter((item) => item.gameId !== gameId));
  };

  // 2. 대여 처리 (검증 로직 포함)
  const processCheckout = () => {
    const today = new Date().toISOString().split('T')[0];

    // [검증 1] 패널티 유무 검사
    if (currentUser.penaltyEndDate && currentUser.penaltyEndDate >= today) {
      alert(`패널티로 인해 대여가 불가능합니다.\n(대여 제한 종료일: ${currentUser.penaltyEndDate})`);
      return false;
    }

    // [검증 2] 최대 대여 가능 수량 (대여중인 수 + 장바구니 수 <= 3) 검사
    if (activeRentalsCount + cart.length > 3) {
      alert(`한 회원당 최대 3개까지만 대여 가능합니다.\n(현재 대여중: ${activeRentalsCount}개, 시도: ${cart.length}개)`);
      return false;
    }

    // 대여 처리 실행
    const newRentals: Rental[] = cart.map((game, index) => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3); // 3일 후 반납예정

      return {
        rentalId: Date.now() + index,
        userId: currentUser.userId,
        gameId: game.gameId,
        gameTitle: game.title,
        status: '대여중',
        startDate: today,
        endDate: endDate.toISOString().split('T')[0],
        returnedAt: null,
      };
    });

    // 게임 상태 -> '대여중' 변경
    const rentedGameIds = cart.map((g) => g.gameId);
    setGames(
      games.map((g) =>
        rentedGameIds.includes(g.gameId) ? { ...g, status: '대여중' } : g
      )
    );

    setRentals([...newRentals, ...rentals]);
    setCart([]);
    alert('성공적으로 대여되었습니다.');
    return true;
  };

  // 3. 개별 반납 처리
  const returnGame = (rentalId: number) => {
    const targetRental = rentals.find((r) => r.rentalId === rentalId);
    if (!targetRental) return;

    const today = new Date().toISOString().split('T')[0];

    // 반납 목록 업데이트
    setRentals(
      rentals.map((r) =>
        r.rentalId === rentalId
          ? { ...r, status: '반납완료', returnedAt: `${today} 14:00` }
          : r
      )
    );

    // 게임 상태 -> '대여가능' 변경
    setGames(
      games.map((g) =>
        g.gameId === targetRental.gameId ? { ...g, status: '대여가능' } : g
      )
    );

    alert(`'${targetRental.gameTitle}' 반납이 완료되었습니다.`);
  };

  // 4. 일괄 반납 처리
  const returnAllGames = () => {
    const userActiveRentals = rentals.filter(
      (r) => r.userId === currentUser.userId && r.status === '대여중'
    );

    if (userActiveRentals.length === 0) {
      alert('반납할 대여중인 보드게임이 없습니다.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const userActiveGameIds = userActiveRentals.map((r) => r.gameId);

    setRentals(
      rentals.map((r) =>
        r.userId === currentUser.userId && r.status === '대여중'
          ? { ...r, status: '반납완료', returnedAt: `${today} 14:00` }
          : r
      )
    );

    setGames(
      games.map((g) =>
        userActiveGameIds.includes(g.gameId) ? { ...g, status: '대여가능' } : g
      )
    );

    alert(`총 ${userActiveRentals.length}개의 보드게임이 모두 반납되었습니다.`);
  };

  // 5. 연체 패널티 산정 로직 (운영자 기능)
  const applyOverduePenalty = (userId: string, overdueDays: number, overdueItemCount: number) => {
    const addedPoints = overdueDays * overdueItemCount; // 연체일수 * 연체게임수
    const today = new Date();

    setUsers(
      users.map((u) => {
        if (u.userId === userId) {
          const currentPoints = u.penaltyPoints + addedPoints;
          const endDate = new Date(today);
          endDate.setDate(endDate.getDate() + currentPoints);

          return {
            ...u,
            penaltyPoints: currentPoints,
            penaltyEndDate: endDate.toISOString().split('T')[0],
          };
        }
        return u;
      })
    );

    alert(`[패널티 부여 완료]\n사용자: ${userId}\n부여 점수: +${addedPoints}점 (연체 ${overdueDays}일 x ${overdueItemCount}개)`);
  };

  // 6. 게임 추가/수정 (운영자)
  const saveGame = (gameData: Game) => {
    const exists = games.some((g) => g.gameId === gameData.gameId);
    if (exists) {
      setGames(games.map((g) => (g.gameId === gameData.gameId ? gameData : g)));
      alert('게임 정보가 수정되었습니다.');
    } else {
      setGames([gameData, ...games]);
      alert('새로운 게임이 등록되었습니다.');
    }
  };

  return {
    users,
    games,
    rentals,
    currentUser,
    setCurrentUser,
    cart,
    addToCart,
    removeFromCart,
    processCheckout,
    returnGame,
    returnAllGames,
    applyOverduePenalty,
    saveGame,
    activeRentalsCount,
  };
}